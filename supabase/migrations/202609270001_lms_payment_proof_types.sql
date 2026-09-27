-- ---------------------------------------------------------------------------
-- Payment proof types: keep the browser, the bucket and the RPC in sync.
--
-- The checkout UI accepts JPG, PNG, WebP and PDF, but the bucket and the
-- submit-proof function only allowed JPG/PNG/PDF. A WebP screenshot was
-- therefore rejected by the server with a raw English storage error.
--
-- Also tightens the stored path check to the exact {uid}/{booking}/{file}
-- shape instead of a prefix match, so a proof can only live in its own
-- booking folder.
-- ---------------------------------------------------------------------------

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'payment-proofs';

create or replace function public.lms_edge_submit_payment_proof(
  p_auth_user_id uuid,
  p_booking_id uuid,
  p_proof_path text,
  p_content_type text,
  p_size integer,
  p_request_id text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  booking_row public.commerce_coursebooking%rowtype;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  select * into booking_row from public.commerce_coursebooking
  where id = p_booking_id and user_id = actor_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking was not found.';
  end if;
  if booking_row.status not in ('awaiting_payment','payment_submitted','rejected') then
    raise exception using errcode = '22023', message = 'Payment proof cannot be changed in the current booking state.';
  end if;
  if p_proof_path !~ ('^' || p_auth_user_id::text || '/' || p_booking_id::text || '/[^/]+$')
    or position('..' in p_proof_path) > 0 then
    raise exception using errcode = '22023', message = 'Payment proof path is invalid.';
  end if;
  if p_content_type not in ('image/jpeg','image/png','image/webp','application/pdf') then
    raise exception using errcode = '22023', message = 'Only JPG, PNG, WebP or PDF payment proofs are accepted.';
  end if;
  if p_size <= 0 or p_size > 5242880 then
    raise exception using errcode = '22023', message = 'Payment proof is empty or larger than the allowed size.';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'payment-proofs' and name = p_proof_path
  ) then
    raise exception using errcode = 'P0002', message = 'Uploaded payment proof was not found in storage.';
  end if;

  update public.commerce_coursebooking set
    proof_path = p_proof_path, proof_content_type = p_content_type, proof_size = p_size,
    payment_submitted_at = now(), status = 'payment_submitted', review_notes = '', updated_at = now()
  where id = p_booking_id;
  perform private.lms_audit('booking.payment_submitted', 'course_booking', p_booking_id::text,
    actor_id, booking_row.organization_id, '', p_request_id,
    jsonb_build_object('proof_path', p_proof_path, 'payment_method', booking_row.payment_method));
  return p_booking_id;
end;
$$;
