# Release History

*****************

## Release ONDEWO Survey Js Client 2.0.2

### Improvements

* [[OND211-2443]](https://ondewo.atlassian.net/browse/OND211-2443) TLS: new `auth/grpcWebEndpoint.js`
  (`buildGrpcWebEndpoint`) builds the gRPC-web endpoint URL for the generated clients per the ONDEWO TLS contract:
  `https://` by default, plaintext `http://` only with `useSecureChannel: false`, which logs a `console.warn` naming
  `host:port`. A bare IPv6 host is bracketed (`::1` becomes `https://[::1]:8443`), a `[...]` host is kept as given, and
  a host carrying a scheme, a path or a port, a port outside 1..65535 or a non-boolean `useSecureChannel` is refused.
* [[OND211-2443]](https://ondewo.atlassian.net/browse/OND211-2443) `grpcCert`, `grpcClientCert` and `grpcClientKey`
  are refused with an error naming the option, never its value: a browser verifies the server against its own trust
  store and presents a client certificate only from its own certificate store, and a private key must never be shipped
  to a browser. Mutual TLS from a browser works with a client certificate installed in the browser / OS certificate
  store, or with the gRPC-web proxy (Envoy) terminating TLS and using mutual TLS upstream.
* [[OND211-2443]](https://ondewo.atlassian.net/browse/OND211-2443) `OfflineTokenProvider` gains `toJSON()` and a Node
  `util.inspect` hook that render the access and refresh tokens as `***REDACTED***` (a token not yet set stays `null`),
  so `JSON.stringify`, `console.log` and `util.inspect` of a provider never print a token.
* [[OND211-2443]](https://ondewo.atlassian.net/browse/OND211-2443) README: new section "TLS, mutual TLS and
  certificates" (modes, the Envoy mutual-TLS setup, why gRPC-web has no keepalive / backoff channel options, and the
  Node.js SDK for mutual TLS from code with PEM files).

### Build

* Regenerated with [ondewo-proto-compiler 5.15.2](https://github.com/ondewo/ondewo-proto-compiler/releases/tag/5.15.2)
  (previous release: 5.10.0) against the same ondewo-survey-api commit 2.0.1 was built from
  (`37d2f92`, branch `OND211-2418-add-keycloak-for-2-fa`). The bundle embeds the `google-protobuf` runtime,
  now pinned to `^4.0.2` (was `^3.21.4`), the line that provides `reader.readStringRequireUtf8()` which the 5.15
  compiler emits. `tests/bundleStringRoundTrip.spec.js` loads the shipped bundle and round-trips a multi-byte string,
  so a generator / runtime mismatch fails the build instead of shipping.

### Tests and release notes

* `auth/grpcWebEndpoint.spec.js` and new `auth/offlineTokenProvider.spec.js` cases cover the endpoint builder and the
  token redaction under the 100% coverage gate.
* `tests/releaseNotes.spec.js` pins the Makefile's release-notes slice, every heading's spelling, one `*****`
  separator per section and a non-empty slice for the released version.
* RELEASE.md: closed the 1.1.0 section with its separator and added the 0.6.0 section (a tag without a release) from
  the tag's git history.

*****************

## Release ONDEWO Survey Js Client 2.0.1

### Bug Fixes

* [[OND221-2830]](https://ondewo.atlassian.net/browse/OND221-2830) Regenerated with [ondewo-proto-compiler 5.13.0](https://github.com/ondewo/ondewo-proto-compiler/releases/tag/5.13.0).
* [[OND221-2830]](https://ondewo.atlassian.net/browse/OND221-2830) No change to how the auth helper is consumed: this package ships a webpack bundle rather than a public-api barrel, and the auth helper is a Node-only `undici` consumer that does not belong in a browser bundle. It ships as its own CommonJS entry and is imported directly (`require('<pkg>/auth/offlineTokenProvider')`).
* [[OND221-2830]](https://ondewo.atlassian.net/browse/OND221-2830) Tooling: `conventional-pre-commit` now runs before `giticket` at the commit-msg stage - with giticket first, its `[OND221-2830] fix: ...` rewrite was no longer valid Conventional Commits and every commit on a ticket branch failed. `README.md` is prettier-ignored where `.prettierrc` sets `useTabs` and markdownlint's MD010 de-tabs the same blocks, and the codegen `docker run` invocations no longer pass `-it`, which fails outside a TTY.

*****************

## Release ONDEWO Survey Js Client 2.0.0

### Improvements

* Tracking API Version [2.0.0](https://github.com/ondewo/ondewo-survey-api/releases/tag/2.0.0) ( [Documentation](https://ondewo.github.io/ondewo-survey-api/) )

*****************

## Release ONDEWO Survey Js Client 1.1.0

### Improvements

* Tracking API Version [1.1.0](https://github.com/ondewo/ondewo-survey-api/releases/tag/1.1.0) ( [Documentation](https://ondewo.github.io/ondewo-survey-api/) )
* Update to SURVEY client version tag 1.1.0
* [[OND211-2039]](https://ondewo.atlassian.net/browse/OND211-2039) - Implemented automated release for GitHub and NPM
* [[OND211-2039]](https://ondewo.atlassian.net/browse/OND211-2039) - Added pre-commit hooks and adjusted files to them

*****************

## Release ONDEWO Survey Js Client 0.6.0

### Improvements

* Initial SURVEY Js client, built on ONDEWO SURVEY API 0.6.0 (`SurveysPromiseClient`, FHIR client)
* Browser example: create a survey, default sample and FHIR client sample, JavaScript object to struct conversion for the create FHIR survey call

*****************
