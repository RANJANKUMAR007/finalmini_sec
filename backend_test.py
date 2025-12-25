#!/usr/bin/env python3

import requests
import sys
import json
import time
import hashlib
from datetime import datetime

class CipherShareAPITester:
    def __init__(self, base_url="https://cryptolink-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_secrets = []

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    self.log(f"   Response: {response.json()}")
                except:
                    self.log(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            self.log(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def hash_pin(self, pin):
        """Hash PIN using SHA256 like the frontend"""
        return hashlib.sha256(pin.encode()).hexdigest()

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_create_secret_basic(self):
        """Test creating a basic secret without PIN"""
        success, response = self.run_test(
            "Create Basic Secret",
            "POST",
            "secrets",
            200,
            data={
                "encrypted_data": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                "iv": "5d41402abc4b2a76b9719d911017c592",
                "pin_hash": None,
                "expiry_minutes": 60,
                "one_time_view": False
            }
        )
        if success and 'id' in response:
            self.created_secrets.append(response['id'])
            return response['id']
        return None

    def test_create_secret_with_pin(self):
        """Test creating a secret with PIN protection"""
        pin_hash = self.hash_pin("1234")
        success, response = self.run_test(
            "Create Secret with PIN",
            "POST",
            "secrets",
            200,
            data={
                "encrypted_data": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                "iv": "5d41402abc4b2a76b9719d911017c592",
                "pin_hash": pin_hash,
                "expiry_minutes": 60,
                "one_time_view": False
            }
        )
        if success and 'id' in response:
            self.created_secrets.append(response['id'])
            return response['id'], pin_hash
        return None, None

    def test_create_one_time_secret(self):
        """Test creating a one-time view secret"""
        success, response = self.run_test(
            "Create One-Time View Secret",
            "POST",
            "secrets",
            200,
            data={
                "encrypted_data": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                "iv": "5d41402abc4b2a76b9719d911017c592",
                "pin_hash": None,
                "expiry_minutes": 60,
                "one_time_view": True
            }
        )
        if success and 'id' in response:
            self.created_secrets.append(response['id'])
            return response['id']
        return None

    def test_get_secret_info(self, secret_id):
        """Test getting secret info"""
        success, response = self.run_test(
            "Get Secret Info",
            "GET",
            f"secrets/{secret_id}",
            200
        )
        return success, response

    def test_get_nonexistent_secret(self):
        """Test getting info for non-existent secret"""
        success, response = self.run_test(
            "Get Non-existent Secret",
            "GET",
            "secrets/nonexistent123",
            404
        )
        return success

    def test_view_secret_without_pin(self, secret_id):
        """Test viewing a secret without PIN"""
        success, response = self.run_test(
            "View Secret (No PIN)",
            "POST",
            f"secrets/{secret_id}/view",
            200,
            data={}
        )
        return success, response

    def test_view_secret_with_pin(self, secret_id, pin_hash):
        """Test viewing a secret with correct PIN"""
        success, response = self.run_test(
            "View Secret (With PIN)",
            "POST",
            f"secrets/{secret_id}/view",
            200,
            data={"pin_hash": pin_hash}
        )
        return success, response

    def test_view_secret_wrong_pin(self, secret_id):
        """Test viewing a secret with wrong PIN"""
        wrong_pin_hash = self.hash_pin("wrong")
        success, response = self.run_test(
            "View Secret (Wrong PIN)",
            "POST",
            f"secrets/{secret_id}/view",
            401,
            data={"pin_hash": wrong_pin_hash}
        )
        return success

    def test_view_secret_missing_pin(self, secret_id):
        """Test viewing a PIN-protected secret without providing PIN"""
        success, response = self.run_test(
            "View Secret (Missing PIN)",
            "POST",
            f"secrets/{secret_id}/view",
            401,
            data={}
        )
        return success

    def test_one_time_view_deletion(self, secret_id):
        """Test that one-time view secrets are deleted after viewing"""
        # First view should work
        success1, response1 = self.test_view_secret_without_pin(secret_id)
        if not success1:
            return False
        
        # Second view should fail (410 - Gone)
        time.sleep(1)  # Small delay
        success2, response2 = self.run_test(
            "One-Time View (Second Attempt)",
            "POST",
            f"secrets/{secret_id}/view",
            410,
            data={}
        )
        return success2

    def test_delete_secret(self, secret_id):
        """Test deleting a secret"""
        success, response = self.run_test(
            "Delete Secret",
            "DELETE",
            f"secrets/{secret_id}",
            200
        )
        return success

    def test_cleanup_endpoint(self):
        """Test the cleanup endpoint"""
        success, response = self.run_test(
            "Cleanup Expired Secrets",
            "POST",
            "cleanup",
            200
        )
        return success

    def test_create_secret_with_files(self):
        """Test creating a secret with files"""
        # Mock encrypted file data
        files_data = [
            {
                "encrypted_data": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                "iv": "5d41402abc4b2a76b9719d911017c592",
                "filename": "test.txt",
                "file_type": "text/plain",
                "file_size": 1024
            },
            {
                "encrypted_data": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                "iv": "5d41402abc4b2a76b9719d911017c593",
                "filename": "image.jpg",
                "file_type": "image/jpeg",
                "file_size": 2048
            }
        ]
        
        success, response = self.run_test(
            "Create Secret with Files",
            "POST",
            "secrets",
            200,
            data={
                "encrypted_data": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                "iv": "5d41402abc4b2a76b9719d911017c592",
                "pin_hash": None,
                "expiry_minutes": 60,
                "one_time_view": False,
                "files": files_data
            }
        )
        if success and 'id' in response:
            self.created_secrets.append(response['id'])
            return response['id']
        return None

    def test_create_secret_files_only(self):
        """Test creating a secret with only files (no text)"""
        files_data = [
            {
                "encrypted_data": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                "iv": "5d41402abc4b2a76b9719d911017c592",
                "filename": "document.pdf",
                "file_type": "application/pdf",
                "file_size": 5120
            }
        ]
        
        success, response = self.run_test(
            "Create Secret (Files Only)",
            "POST",
            "secrets",
            200,
            data={
                "encrypted_data": " ",  # Empty text
                "iv": "5d41402abc4b2a76b9719d911017c592",
                "pin_hash": None,
                "expiry_minutes": 60,
                "one_time_view": False,
                "files": files_data
            }
        )
        if success and 'id' in response:
            self.created_secrets.append(response['id'])
            return response['id']
        return None

    def test_file_size_limit(self):
        """Test file size limit validation (10MB total)"""
        # Create files that exceed 10MB total
        large_files = [
            {
                "encrypted_data": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                "iv": "5d41402abc4b2a76b9719d911017c592",
                "filename": "large1.zip",
                "file_type": "application/zip",
                "file_size": 6 * 1024 * 1024  # 6MB
            },
            {
                "encrypted_data": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
                "iv": "5d41402abc4b2a76b9719d911017c593",
                "filename": "large2.zip",
                "file_type": "application/zip",
                "file_size": 5 * 1024 * 1024  # 5MB (total 11MB)
            }
        ]
        
        success, response = self.run_test(
            "File Size Limit Test",
            "POST",
            "secrets",
            413,  # Payload Too Large
            data={
                "encrypted_data": "test",
                "iv": "5d41402abc4b2a76b9719d911017c592",
                "pin_hash": None,
                "expiry_minutes": 60,
                "one_time_view": False,
                "files": large_files
            }
        )
        return success

    def test_get_secret_info_with_files(self, secret_id):
        """Test getting secret info that includes file information"""
        success, response = self.run_test(
            "Get Secret Info (With Files)",
            "GET",
            f"secrets/{secret_id}",
            200
        )
        
        if success:
            # Check if response includes file information
            expected_fields = ['has_files', 'files_info']
            for field in expected_fields:
                if field not in response:
                    self.log(f"❌ Missing field in response: {field}")
                    return False
            
            if response.get('has_files'):
                files_info = response.get('files_info', [])
                if not files_info:
                    self.log(f"❌ has_files is True but files_info is empty")
                    return False
                
                # Check file info structure
                for file_info in files_info:
                    required_fields = ['filename', 'file_type', 'file_size']
                    for field in required_fields:
                        if field not in file_info:
                            self.log(f"❌ Missing field in file_info: {field}")
                            return False
                
                self.log(f"✅ File info validation passed - {len(files_info)} files")
        
        return success, response

    def test_view_secret_with_files(self, secret_id):
        """Test viewing a secret that contains files"""
        success, response = self.run_test(
            "View Secret (With Files)",
            "POST",
            f"secrets/{secret_id}/view",
            200,
            data={}
        )
        
        if success:
            # Check if response includes file data
            if 'files' in response and response['files']:
                files = response['files']
                self.log(f"✅ Retrieved {len(files)} files")
                
                # Check file structure
                for i, file_data in enumerate(files):
                    required_fields = ['encrypted_data', 'iv', 'filename', 'file_type', 'file_size']
                    for field in required_fields:
                        if field not in file_data:
                            self.log(f"❌ Missing field in file {i}: {field}")
                            return False
                
                self.log(f"✅ File data validation passed")
            else:
                self.log(f"❌ Expected files in response but got none")
                return False
        
        return success, response

    def test_invalid_data(self):
        """Test creating secret with invalid data"""
        # Test with missing required fields
        success, response = self.run_test(
            "Create Secret (Invalid Data)",
            "POST",
            "secrets",
            422,  # Validation error
            data={
                "encrypted_data": "test",
                # Missing iv, expiry_minutes
            }
        )
        return success

    def run_all_tests(self):
        """Run all tests"""
        self.log("🚀 Starting CipherShare API Tests")
        self.log(f"Testing against: {self.api_url}")
        
        # Test 1: Root endpoint
        self.test_root_endpoint()
        
        # Test 2: Create basic secret
        basic_secret_id = self.test_create_secret_basic()
        
        # Test 3: Create secret with PIN
        pin_secret_id, pin_hash = self.test_create_secret_with_pin()
        
        # Test 4: Create one-time view secret
        one_time_secret_id = self.test_create_one_time_secret()
        
        # Test 5: Create secret with files
        files_secret_id = self.test_create_secret_with_files()
        
        # Test 6: Create secret with files only (no text)
        files_only_secret_id = self.test_create_secret_files_only()
        
        # Test 7: Test file size limit
        self.test_file_size_limit()
        
        # Test 8: Get secret info
        if basic_secret_id:
            self.test_get_secret_info(basic_secret_id)
        
        # Test 9: Get secret info with files
        if files_secret_id:
            self.test_get_secret_info_with_files(files_secret_id)
        
        # Test 10: Get non-existent secret
        self.test_get_nonexistent_secret()
        
        # Test 11: View secret without PIN
        if basic_secret_id:
            self.test_view_secret_without_pin(basic_secret_id)
        
        # Test 12: View secret with files
        if files_secret_id:
            self.test_view_secret_with_files(files_secret_id)
        
        # Test 13: View secret with correct PIN
        if pin_secret_id and pin_hash:
            self.test_view_secret_with_pin(pin_secret_id, pin_hash)
        
        # Test 14: View secret with wrong PIN
        if pin_secret_id:
            self.test_view_secret_wrong_pin(pin_secret_id)
        
        # Test 15: View secret missing PIN
        if pin_secret_id:
            self.test_view_secret_missing_pin(pin_secret_id)
        
        # Test 16: One-time view deletion
        if one_time_secret_id:
            self.test_one_time_view_deletion(one_time_secret_id)
        
        # Test 17: Invalid data
        self.test_invalid_data()
        
        # Test 18: Cleanup endpoint
        self.test_cleanup_endpoint()
        
        # Test 19: Delete remaining secrets
        for secret_id in self.created_secrets:
            if secret_id not in [one_time_secret_id]:  # Skip already deleted
                self.test_delete_secret(secret_id)
        
        # Print results
        self.log(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        self.log(f"Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All tests passed!")
            return 0
        else:
            self.log("❌ Some tests failed")
            return 1

def main():
    tester = CipherShareAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())