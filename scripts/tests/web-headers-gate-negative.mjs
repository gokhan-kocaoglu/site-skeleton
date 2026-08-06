// Negative proof for the AC-33 build-artifact oracle (scripts/quality/gate-web-headers.mjs).
//
// The oracle only earns trust if the mutations it claims to reject have been
// seen to fail. Every scenario below is a real mutation of a build artifact
// shape, fed to the pure checker; each asserts a specific reason code, so a
// future refactor cannot loosen a rule while the suite still "passes".
//
// The baseline is written here as INDEPENDENT literals — it is not imported
// from the gate and not read back from apps/web. When the positive control
// passes, two separately authored copies of the contract agreed; that is the
// only non-tautological way this file can vouch for the gate.
//
// stdlib only, offline, no fixtures on disk.
import { checkWebHeaderArtifacts } from '../quality/gate-web-headers.mjs';

const CSP_PRODUCTION =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'";
const IMAGE_CSP = "default-src 'self'; script-src 'none'; sandbox;";

function baselineRoutesManifest() {
  return {
    version: 3,
    headers: [
      {
        source: '/(.*)',
        regex: '^(?:/(.*))(?:/)?$',
        headers: [
          { key: 'Content-Security-Policy', value: CSP_PRODUCTION },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ],
  };
}

function baselineRequiredServerFiles() {
  return { config: { poweredByHeader: false, images: { contentSecurityPolicy: IMAGE_CSP } } };
}

const rule = (m) => m.headers[0];

const CASES = [
  // --- positive control ----------------------------------------------------
  {
    name: 'mutasyonsuz artefakt çifti PASS verir (pozitif kontrol)',
    expectOk: true,
  },

  // --- rule-shape bypass: the silent-kill class ----------------------------
  {
    name: "has eklenirse reddedilir (production'da sıfır header, testler yeşil)",
    mutateRoutes: (m) => {
      rule(m).has = [{ type: 'header', key: 'x-never-sent' }];
    },
    expectCode: 'RULE_KEYS',
  },
  {
    name: 'missing eklenirse reddedilir',
    mutateRoutes: (m) => {
      rule(m).missing = [{ type: 'header', key: 'x-always-sent' }];
    },
    expectCode: 'RULE_KEYS',
  },
  {
    name: 'locale eklenirse reddedilir',
    mutateRoutes: (m) => {
      rule(m).locale = false;
    },
    expectCode: 'RULE_KEYS',
  },
  {
    name: 'basePath eklenirse reddedilir',
    mutateRoutes: (m) => {
      rule(m).basePath = false;
    },
    expectCode: 'RULE_KEYS',
  },
  {
    name: 'regex anahtarı silinirse reddedilir (anahtar kümesi allowlist)',
    mutateRoutes: (m) => {
      delete rule(m).regex;
    },
    expectCode: 'RULE_KEYS',
  },

  // --- scope drift ---------------------------------------------------------
  {
    name: 'source /:path* biçimine kayarsa reddedilir',
    mutateRoutes: (m) => {
      rule(m).source = '/:path*';
    },
    expectCode: 'RULE_SOURCE',
  },
  {
    name: 'derlenmiş regex sürüklenirse reddedilir',
    mutateRoutes: (m) => {
      rule(m).regex = '^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$';
    },
    expectCode: 'RULE_REGEX',
  },
  {
    name: 'kural sayısı 1 değilse reddedilir',
    mutateRoutes: (m) => {
      m.headers.push({ source: '/admin', regex: '^/admin$', headers: [] });
    },
    expectCode: 'RULE_COUNT',
  },
  {
    name: 'headers dizisi hiç yoksa reddedilir',
    mutateRoutes: (m) => {
      delete m.headers;
    },
    expectCode: 'RULE_COUNT',
  },

  // --- header set drift ----------------------------------------------------
  {
    name: 'bir header silinirse reddedilir',
    mutateRoutes: (m) => {
      rule(m).headers = rule(m).headers.filter((h) => h.key !== 'Referrer-Policy');
    },
    expectCode: 'HEADER_SET',
  },
  {
    name: 'header sırası değişirse reddedilir',
    mutateRoutes: (m) => {
      rule(m).headers.reverse();
    },
    expectCode: 'HEADER_SET',
  },
  {
    name: 'header adı case değiştirirse reddedilir',
    mutateRoutes: (m) => {
      rule(m).headers[1].key = 'x-frame-options';
    },
    expectCode: 'HEADER_SET',
  },
  {
    name: 'bir değer sürüklenirse reddedilir (SAMEORIGIN)',
    mutateRoutes: (m) => {
      rule(m).headers[1].value = 'SAMEORIGIN';
    },
    expectCode: 'HEADER_SET',
  },
  {
    name: 'CSP tek bir direktifte gevşerse reddedilir (connect-src *)',
    mutateRoutes: (m) => {
      rule(m).headers[0].value = CSP_PRODUCTION.replace("connect-src 'self'", 'connect-src *');
    },
    expectCode: 'HEADER_SET',
  },
  {
    name: 'yinelenen header adı reddedilir (case-insensitive)',
    mutateRoutes: (m) => {
      rule(m).headers.push({ key: 'referrer-policy', value: 'no-referrer' });
    },
    expectCode: 'HEADER_DUPLICATE',
  },
  {
    name: 'apps/web HSTS emit ederse reddedilir',
    mutateRoutes: (m) => {
      rule(m).headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000' });
    },
    expectCode: 'HSTS_EMITTED',
  },
  {
    name: "'unsafe-inline' yanına nonce girerse reddedilir (sessizce etkisizleşir)",
    mutateRoutes: (m) => {
      rule(m).headers[0].value = CSP_PRODUCTION.replace(
        "script-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline' 'nonce-abc123'"
      );
    },
    expectCode: 'CSP_UNSAFE_INLINE_NEUTRALISED',
  },

  // --- resolved-config drift ----------------------------------------------
  {
    name: 'poweredByHeader true olursa reddedilir',
    mutateServerFiles: (f) => {
      f.config.poweredByHeader = true;
    },
    expectCode: 'POWERED_BY_HEADER',
  },
  {
    name: 'image optimizer CSP tamamen kaldırılırsa reddedilir',
    mutateServerFiles: (f) => {
      delete f.config.images;
    },
    expectCode: 'IMAGE_CSP',
  },
  {
    name: "image optimizer CSP script-src 'none' kaybederse reddedilir",
    mutateServerFiles: (f) => {
      f.config.images.contentSecurityPolicy = "default-src 'self'; script-src 'self'; sandbox;";
    },
    expectCode: 'IMAGE_CSP_SCRIPT_SRC',
  },
  {
    name: 'image optimizer CSP sandbox kaybederse reddedilir',
    mutateServerFiles: (f) => {
      f.config.images.contentSecurityPolicy = "default-src 'self'; script-src 'none';";
    },
    expectCode: 'IMAGE_CSP_SANDBOX',
  },
  {
    name: 'image optimizer CSP yanlış değere çevrilirse reddedilir',
    mutateServerFiles: (f) => {
      f.config.images.contentSecurityPolicy = "default-src 'none'; script-src 'none'; sandbox;";
    },
    expectCode: 'IMAGE_CSP',
  },

  // --- fail-closed on absent evidence -------------------------------------
  {
    name: 'routes-manifest okunamazsa reddedilir (fail-closed)',
    routesNull: true,
    expectCode: 'ROUTES_MANIFEST_MISSING',
  },
  {
    name: 'required-server-files okunamazsa reddedilir (fail-closed)',
    serverFilesNull: true,
    expectCode: 'REQUIRED_SERVER_FILES_MISSING',
  },
];

let failed = 0;
for (const c of CASES) {
  const routes = c.routesNull ? null : baselineRoutesManifest();
  const serverFiles = c.serverFilesNull ? null : baselineRequiredServerFiles();
  if (c.mutateRoutes) c.mutateRoutes(routes);
  if (c.mutateServerFiles) c.mutateServerFiles(serverFiles);

  const result = checkWebHeaderArtifacts(routes, serverFiles);
  const codes = result.failures.map((f) => f.code);

  if (c.expectOk) {
    if (!result.ok) {
      failed++;
      console.error(`  x ${c.name}\n      beklenen PASS, alınan: ${JSON.stringify(codes)}`);
      continue;
    }
  } else {
    if (result.ok) {
      failed++;
      console.error(`  x ${c.name}\n      beklenen FAIL (${c.expectCode}), oracle PASS verdi`);
      continue;
    }
    if (!codes.includes(c.expectCode)) {
      failed++;
      console.error(`  x ${c.name}\n      beklenen kod ${c.expectCode}, alınan: ${JSON.stringify(codes)}`);
      continue;
    }
  }
  console.log(`  ok ${c.name}`);
}

if (failed) {
  console.error(`\nFAIL — ${failed}/${CASES.length} senaryo beklenen sonucu vermedi`);
  process.exit(1);
}
console.log(`\nPASS — ${CASES.length} senaryo (1 pozitif kontrol, ${CASES.length - 1} negatif)`);
