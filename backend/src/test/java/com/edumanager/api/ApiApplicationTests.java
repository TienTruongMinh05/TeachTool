package com.edumanager.api;

import com.edumanager.api.repository.SubmissionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class ApiApplicationTests {

	@Autowired
	private SubmissionRepository submissionRepo;

	@Autowired
	private com.edumanager.api.service.EncryptionService encryptionService;

	@Test
	void contextLoads() {
		assertNotNull(submissionRepo);
		assertNotNull(encryptionService);
	}

	@Test
	void testEncryptionService() {
		String original = "Thưa cô, bài tập Speaking phần friends em nên dùng thì hiện tại hoàn thành hay quá khứ đơn ạ?";
		String encrypted = encryptionService.encrypt(original);
		assertNotNull(encrypted);
		org.junit.jupiter.api.Assertions.assertTrue(encrypted.startsWith("ENC:"));
		org.junit.jupiter.api.Assertions.assertNotEquals(original, encrypted);

		String decrypted = encryptionService.decrypt(encrypted);
		org.junit.jupiter.api.Assertions.assertEquals(original, decrypted);
	}

	@Test
	void testFindByClassRoomIdQuery() {
		// Verify JPQL query compilation and execution
		var submissions = submissionRepo.findByClassRoomId(1L);
		assertNotNull(submissions);
	}
}

