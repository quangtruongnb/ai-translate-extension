import fs from 'fs';
import path from 'path';

const manifestPath = path.resolve('dist/manifest.json');

try {
  const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestRaw);

  if (manifest.background && manifest.background.service_worker) {
    // Add the scripts array pointing to the generated service worker loader
    manifest.background.scripts = [manifest.background.service_worker];
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Successfully patched dist/manifest.json for Firefox compatibility.');
  } else {
    console.warn('⚠️ No background.service_worker found in dist/manifest.json');
  }
} catch (err) {
  console.error('❌ Failed to patch manifest for Firefox:', err.message);
  process.exit(1);
}
