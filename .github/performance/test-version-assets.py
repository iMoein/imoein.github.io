import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

sp=importlib.util.spec_from_file_location('version_assets',Path(__file__).with_name('version-assets.py'))
mod=importlib.util.module_from_spec(sp);sp.loader.exec_module(mod)

class VersionTests(unittest.TestCase):
    def setUp(self):
        d=tempfile.TemporaryDirectory()
        self.addCleanup(d.cleanup)
        self.root=Path(d.name)
        (self.root/'en').mkdir()
        self.css=self.root/'styles.css'
        self.js=self.root/'site.js'
        self.css.write_text('body{color:red}')
        self.js.write_text('window.test=1;')
        self.page=self.root/'en/index.html'
        self.page.write_text('<link rel="stylesheet" href="../styles.css?v=old"><script src="/site.js"></script><link rel="canonical" href="https://imoein.com/en/"><script src="https://example.com/a.js"></script>')
    def test_revision_uses_final_bytes_and_preserves_existing_query(self):
        report=mod.apply(self.root)
        self.assertEqual(report['references'],2)
        code=self.page.read_text()
        digest=hashlib.sha256(self.css.read_bytes()).hexdigest()[:16]
        self.assertIn('../styles.css?v=old&amp;rev='+digest,code)
        self.assertIn('https://example.com/a.js',code)
        self.assertIn('https://imoein.com/en/',code)
        mod.apply(self.root,check=True)
        mod.apply(self.root)
        self.assertEqual(code,self.page.read_text())
    def test_changed_bytes_invalidate_revision(self):
        mod.apply(self.root)
        self.js.write_text('window.test=2;')
        with self.assertRaisesRegex(ValueError,'Stale asset revision'):mod.apply(self.root,check=True)
        mod.apply(self.root);mod.apply(self.root,check=True)
    def test_missing_resource_does_not_write_any_page(self):
        original=self.page.read_text()
        self.js.unlink()
        with self.assertRaisesRegex(ValueError,'Missing or unsafe'):mod.apply(self.root)
        self.assertEqual(original,self.page.read_text())
    def test_rejects_source(self):
        with self.assertRaisesRegex(ValueError,'isolated'):mod.apply(mod.ROOT)
if __name__=='__main__':unittest.main()
