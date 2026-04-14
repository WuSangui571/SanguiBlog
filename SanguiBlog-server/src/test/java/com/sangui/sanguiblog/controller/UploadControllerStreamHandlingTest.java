package com.sangui.sanguiblog.controller;

import com.sangui.sanguiblog.config.StoragePathResolver;
import com.sangui.sanguiblog.model.dto.ApiResponse;
import com.sangui.sanguiblog.service.AvatarStorageService;
import com.sangui.sanguiblog.service.PostAssetService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UploadControllerStreamHandlingTest {

    @TempDir
    Path tempDir;

    @Test
    void uploadPostCoverShouldCloseMultipartInputStreamAfterSaving() throws IOException {
        StoragePathResolver storagePathResolver = new StoragePathResolver(tempDir.toString());
        UploadController controller = new UploadController(
                storagePathResolver,
                new PostAssetService(storagePathResolver),
                new AvatarStorageService(storagePathResolver)
        );
        TrackingMultipartFile file = new TrackingMultipartFile("cover.png", "image/png", new byte[] {1, 2, 3, 4});

        ApiResponse<Map<String, String>> response = controller.uploadPostCover(file, "posts/demo-post");

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertTrue(file.wasClosed(), "封面上传后应主动关闭 Multipart 输入流，避免请求长时间卡在上传中");

        Map<String, String> data = response.getData();
        assertNotNull(data);
        assertEquals("covers/demo-post", Path.of(data.get("path")).getParent().toString().replace("\\", "/"));
        assertTrue(Files.exists(tempDir.resolve(data.get("path"))), "封面文件应成功落盘");
    }

    private static final class TrackingMultipartFile implements MultipartFile {
        private final String originalFilename;
        private final String contentType;
        private final byte[] bytes;
        private final TrackingInputStream inputStream;

        private TrackingMultipartFile(String originalFilename, String contentType, byte[] bytes) {
            this.originalFilename = originalFilename;
            this.contentType = contentType;
            this.bytes = bytes.clone();
            this.inputStream = new TrackingInputStream(this.bytes);
        }

        private boolean wasClosed() {
            return inputStream.closed;
        }

        @Override
        public String getName() {
            return "file";
        }

        @Override
        public String getOriginalFilename() {
            return originalFilename;
        }

        @Override
        public String getContentType() {
            return contentType;
        }

        @Override
        public boolean isEmpty() {
            return bytes.length == 0;
        }

        @Override
        public long getSize() {
            return bytes.length;
        }

        @Override
        public byte[] getBytes() {
            return bytes.clone();
        }

        @Override
        public InputStream getInputStream() {
            return inputStream;
        }

        @Override
        public void transferTo(java.io.File dest) throws IOException, IllegalStateException {
            Files.write(dest.toPath(), bytes);
        }
    }

    private static final class TrackingInputStream extends ByteArrayInputStream {
        private boolean closed;

        private TrackingInputStream(byte[] buf) {
            super(buf);
        }

        @Override
        public void close() throws IOException {
            closed = true;
            super.close();
        }
    }
}
