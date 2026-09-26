<?php
/**
 * Temporary diagnostics: exports TranslatePress's logged database errors once.
 */
defined( 'ABSPATH' ) || exit;

add_action( 'init', static function () {
	if ( get_option( 'agoza_trp_error_exported_v1' ) ) {
		return;
	}

	$directory = dirname( ABSPATH ) . '/.agoza-diagnostics';
	if ( ! wp_mkdir_p( $directory ) ) {
		return;
	}

	$payload = wp_json_encode( get_option( 'trp_db_errors', array() ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES );
	if ( false !== $payload && false !== file_put_contents( $directory . '/trp-db-errors.json', $payload, LOCK_EX ) ) {
		@chmod( $directory, 0700 );
		@chmod( $directory . '/trp-db-errors.json', 0600 );
		update_option( 'agoza_trp_error_exported_v1', time(), false );
	}
}, 1 );
