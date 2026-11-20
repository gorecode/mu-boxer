from pathlib import Path
from tempfile import TemporaryDirectory
import json
import subprocess
import sys
import unittest
from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / 'prepare-fight-assets.py'


class PrepareTest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / 'source'
        self.output = Path(self.temp.name) / 'output'
        self.source.mkdir()
        for name in ['boxer', 'worker']:
            main = Image.new('RGBA', (1448, 1086))
            for i in range(8):
                main.paste((90, 100, 110, 255), (40 + i % 4 * 360, 50 + i // 4 * 540,
                    190 + i % 4 * 360, 450 + i // 4 * 540))
            main.save(self.source / f'fight-{name}-source.png')
            extra = Image.new('RGBA', (1774, 887))
            for i in range(4):
                x, y = i % 2 * 887, i // 2 * 443
                extra.paste((90, 100, 110, 255), (x + 60, y + 60, x + 260, y + 360))
                extra.putpixel((x + 1, y + 1), (255, 0, 0, 255))
            if name == 'worker':
                extra.paste((150, 120, 80, 255), (1187, 743, 1437, 823))
            extra.save(self.source / f'fight-{name}-extra-source.png')

    def run_prepare(self):
        return subprocess.run([sys.executable, str(SCRIPT), '--fighters-source', str(self.source),
            '--output', str(self.output)], capture_output=True, text=True)

    def test_alternate_sheets_keep_pose_anchors_and_detached_shovel_without_fragments(self):
        result = self.run_prepare()
        self.assertEqual(result.returncode, 0, result.stderr)
        manifest = json.loads((self.output / 'manifest.json').read_text())
        self.assertEqual(set(manifest), {'boxer', 'worker'})
        for name in ['boxer', 'worker']:
            self.assertEqual(len(manifest[name]), 12)
            for i, frame in enumerate(manifest[name]):
                with Image.open(self.output / f'{name}-{i}.webp') as image:
                    self.assertEqual(image.size, (frame['width'], frame['height']))
            self.assertEqual(manifest[name][8]['width'], 200)
            self.assertEqual(manifest[name][8]['height'], 300)
        self.assertEqual(manifest['boxer'][0]['anchorX'], 138)
        self.assertEqual(manifest['boxer'][0]['anchorY'], 464)
        self.assertEqual(manifest['worker'][11]['width'], 490)
        self.assertEqual(manifest['worker'][11]['height'], 320)
        with Image.open(self.output / 'worker-11.webp') as image:
            self.assertEqual(image.getpixel((300, 270))[3], 255)
            self.assertEqual(image.getpixel((220, 270))[3], 0)

    def test_wrong_sheet_size_is_rejected(self):
        Image.new('RGBA', (100, 100)).save(self.source / 'fight-boxer-source.png')
        result = self.run_prepare()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('(100, 100)', result.stderr)
        self.assertFalse((self.output / 'manifest.json').exists())

    def test_missing_main_poses_are_rejected(self):
        Image.new('RGBA', (1448, 1086)).save(self.source / 'fight-boxer-source.png')
        result = self.run_prepare()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("('boxer', [])", result.stderr)
        self.assertFalse((self.output / 'manifest.json').exists())


if __name__ == '__main__':
    unittest.main()
