# Spring Boot Integration Notes

This frontend is currently a static prototype. The local canvas preview will keep working until you connect the backend.

## Frontend Switch

In `script.js`, update:

```js
const BACKEND_CONFIG = {
  useBackend: true,
  baseUrl: "http://localhost:8080",
  endpoints: {
    textToImage: "/api/images/text-to-image",
    imageToImage: "/api/images/image-to-image",
  },
};
```

Keep `useBackend: false` while testing only the frontend.

## Expected API

Text to image:

```http
POST /api/images/text-to-image
Content-Type: application/json
```

```json
{
  "prompt": "Create ghibli studio art",
  "style": "anime"
}
```

Image to image:

```http
POST /api/images/image-to-image
Content-Type: multipart/form-data
```

Fields:

```text
prompt: string
style: anime | comic | cinematic | cartoon | watercolor | fantasy
image: file
```

Frontend expects one of these response formats:

```json
{ "imageUrl": "http://localhost:8080/generated/result.png" }
```

or:

```json
{ "imageBase64": "iVBORw0KGgo..." }
```

## Spring Boot CORS Example

Use this if the frontend runs from Live Server or a different port:

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("http://127.0.0.1:5500", "http://localhost:5500")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*");
            }
        };
    }
}
```

## Controller Skeleton

```java
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/images")
public class ImageController {

    @PostMapping("/text-to-image")
    public ResponseEntity<Map<String, String>> textToImage(@RequestBody TextToImageRequest request) {
        // TODO: Call your image generation service here.
        return ResponseEntity.ok(Map.of("imageUrl", "http://localhost:8080/generated/sample.png"));
    }

    @PostMapping("/image-to-image")
    public ResponseEntity<Map<String, String>> imageToImage(
            @RequestParam String prompt,
            @RequestParam String style,
            @RequestParam MultipartFile image
    ) {
        // TODO: Store/process uploaded image and return the generated result.
        return ResponseEntity.ok(Map.of("imageUrl", "http://localhost:8080/generated/sample.png"));
    }
}
```

```java
public record TextToImageRequest(String prompt, String style) {}
```

