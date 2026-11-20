"""API security regression checks using fake medical data, no network."""
import importlib.util
import io
import os
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

ENGINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ENGINE))
from security_guards import is_loopback_peer, allowed_web_origins, is_telegram_recipient_allowed

class TestSecurityGuards(unittest.TestCase):
    def test_network_peer_is_restricted_to_loopback(self):
        for host in ('127.0.0.1', '::1', '::ffff:127.0.0.1'):
            self.assertTrue(is_loopback_peer(host), host)
        for host in ('198.51.100.2', '10.1.2.3', '0.0.0.0', 'localhost', '', None):
            self.assertFalse(is_loopback_peer(host), host)

    def test_cors_defaults_closed_and_never_accepts_wildcard(self):
        with patch.dict(os.environ, {'FICHE_ENGINE_ALLOWED_ORIGINS': '* , https://trusted.invalid'}, clear=False):
            self.assertEqual(allowed_web_origins(), ['https://trusted.invalid'])
        with patch.dict(os.environ, {'FICHE_ENGINE_ALLOWED_ORIGINS': ''}, clear=False):
            self.assertEqual(allowed_web_origins(), [])

    def test_telegram_recipient_fail_closed(self):
        with patch.dict(os.environ, {'FICHE_TELEGRAM_ALLOWED_CHAT_IDS': ''}, clear=False):
            self.assertFalse(is_telegram_recipient_allowed('12345'))
        with patch.dict(os.environ, {'FICHE_TELEGRAM_ALLOWED_CHAT_IDS': '12345, 23456'}, clear=False):
            self.assertTrue(is_telegram_recipient_allowed('12345'))
            self.assertFalse(is_telegram_recipient_allowed('67890'))


class TestFicheHTTP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mock_fm = types.ModuleType('fiche_medicale')
        cls.mock_fm.load_database = lambda _path: {'personnel':[1], 'vms':[1]}
        sys.modules['fiche_medicale'] = cls.mock_fm
        spec = importlib.util.spec_from_file_location('fiche_engine_security_test', ENGINE / 'app.py')
        cls.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.module)

    def setUp(self):
        self.client = self.module.app.test_client()
        self.module._db = None
        self.module._db_info = {}

    def test_remote_direct_request_is_refused(self):
        resp = self.client.get('/api/fiche-engine/health',
                               environ_overrides={'REMOTE_ADDR':'198.51.100.2'})
        self.assertEqual(resp.status_code, 403)

    def test_same_origin_health_and_no_wildcard_cors(self):
        resp = self.client.get('/api/fiche-engine/health',
                               headers={'Origin':'https://evil.invalid'})
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn('Access-Control-Allow-Origin', resp.headers)
        self.assertEqual(self.module.app.config['MAX_CONTENT_LENGTH'], 32*1024*1024)

    def test_bad_upload_preserves_previous_loaded_data_and_redacts_error(self):
        before = {'personnel':['SYNTHETIC_001'], 'vms':['SYNTHETIC_001']}
        self.module._db = before
        self.module._db_info = {'filename':'previous_fake.xlsx'}
        with patch.object(self.mock_fm,'load_database',side_effect=ValueError('INTERNAL FICTIVE DETAILS')):
            r=self.client.post('/api/fiche-engine/upload',
                data={'file':(io.BytesIO(b'fake xlsx bytes'),'fake.xlsx')},
                content_type='multipart/form-data')
        self.assertEqual(r.status_code,500)
        self.assertNotIn('INTERNAL FICTIVE DETAILS',r.get_data(as_text=True))
        self.assertIs(self.module._db,before)
        self.assertEqual(self.module._db_info['filename'],'previous_fake.xlsx')

    def test_telegram_send_denies_unapproved_recipient_without_network(self):
        self.module._db = {'personnel':['SYNTHETIC'], 'vms':[]}
        with patch.dict(os.environ, {'TELEGRAM_TOKEN':'SYNTHETIC_TOKEN',
                                     'FICHE_TELEGRAM_ALLOWED_CHAT_IDS':''}, clear=False):
            r=self.client.post('/api/fiche-engine/send-telegram',
                               json={'matricule':123,'chat_id':'12345'})
        self.assertEqual(r.status_code,403)


if __name__=='__main__':
    unittest.main()
