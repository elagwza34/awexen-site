/* Service worker لإشعارات الدعم على الموبايل (Web Push).
   نسخة v2: ينظّف أي كاش قديم عند التنشيط حتى لا تبقى ملفات بناء قديمة.
   لا يعترض طلبات الشبكة (لا fetch handler) لضمان وصول أحدث HTML دائمًا. */

const SW_VERSION = "awexen-sw-v2";
const CACHE_PREFIX = "awexen-";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // لا يوجد كاش تستخدمه نسخة v2، فأي كاش قديم من نسخ سابقة يُحذف بالكامل.
      try {
        const names = await caches.keys();
        await Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) || name === SW_VERSION)
            .map((name) => caches.delete(name)),
        );
      } catch {
        // المتصفح قد يمنع الكاش؛ نكمل التنشيط على أي حال.
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = typeof data.title === "string" && data.title ? data.title : "رسالة دعم جديدة";
  const body = typeof data.body === "string" && data.body ? data.body : "افتح لوحة التحكم للرد على الزائر.";
  const url = typeof data.url === "string" && data.url ? data.url : "/awexen?section=support";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/images/fav--icon.png",
      badge: "/images/fav--icon.png",
      tag: typeof data.tag === "string" && data.tag ? data.tag : "support",
      data: { url },
      vibrate: [140, 70, 140],
    }),
  );
});

function isAdminClient(clientUrl) {
  try {
    return new URL(clientUrl).pathname.startsWith("/awexen");
  } catch {
    return false;
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/awexen?section=support";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (isAdminClient(client.url)) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              // بعض المتصفحات بترفض التنقل؛ يكفي تركيز النافذة.
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
