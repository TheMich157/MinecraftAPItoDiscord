package com.whitelisthub.api.controller;

import com.whitelisthub.api.config.ServerConfig;
import com.whitelisthub.api.service.RconService;
import com.whitelisthub.api.service.WhitelistService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/whitelist")
@RequiredArgsConstructor
public class WhitelistController {
    
    private final WhitelistService whitelistService;
    private final RconService rconService;
    private final ServerConfig serverConfig;
    
    @PostMapping("/add")
    public ResponseEntity<?> addToWhitelist(
            @RequestBody @Valid AddWhitelistRequest request,
            HttpServletRequest httpRequest) {
        
        String ip = getClientIp(httpRequest);
        
        try {
            whitelistService.addToWhitelist(request.getUsername());
            
            logAudit("ADD_WHITELIST", request.getUsername(), ip, true, null);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", request.getUsername() + " added to whitelist");
            response.put("username", request.getUsername());
            response.put("mode", serverConfig.getMode().name().toLowerCase());
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            logAudit("ADD_WHITELIST", request.getUsername(), ip, false, e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
                
        } catch (IllegalStateException e) {
            logAudit("ADD_WHITELIST", request.getUsername(), ip, false, e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", e.getMessage()));
                
        } catch (IOException e) {
            log.error("Error adding to whitelist: {}", e.getMessage());
            logAudit("ADD_WHITELIST", request.getUsername(), ip, false, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to add to whitelist", "details", e.getMessage()));
        }
    }
    
    @DeleteMapping("/remove")
    public ResponseEntity<?> removeFromWhitelist(
            @RequestBody @Valid RemoveWhitelistRequest request,
            HttpServletRequest httpRequest) {
        
        String ip = getClientIp(httpRequest);
        
        try {
            whitelistService.removeFromWhitelist(request.getUsername());
            
            logAudit("REMOVE_WHITELIST", request.getUsername(), ip, true, null);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", request.getUsername() + " removed from whitelist");
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            logAudit("REMOVE_WHITELIST", request.getUsername(), ip, false, e);
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
                
        } catch (IllegalStateException e) {
            logAudit("REMOVE_WHITELIST", request.getUsername(), ip, false, e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", e.getMessage()));
                
        } catch (IOException e) {
            log.error("Error removing from whitelist: {}", e.getMessage());
            logAudit("REMOVE_WHITELIST", request.getUsername(), ip, false, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to remove from whitelist", "details", e.getMessage()));
        }
    }
    
    @GetMapping("/status")
    public ResponseEntity<?> getStatus(HttpServletRequest httpRequest) {
        String ip = getClientIp(httpRequest);
        
        try {
            WhitelistService.WhitelistStatus status = whitelistService.getStatus();
            
            logAudit("STATUS_CHECK", null, ip, true, null);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", status.count());
            response.put("users", status.users());
            response.put("mode", status.mode());
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalStateException e) {
            logAudit("STATUS_CHECK", null, ip, false, e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", e.getMessage()));
                
        } catch (IOException e) {
            log.error("Error reading whitelist status: {}", e.getMessage());
            logAudit("STATUS_CHECK", null, ip, false, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to read whitelist", "details", e.getMessage()));
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("service", "minecraft-whitelist-api");
        response.put("mode", serverConfig.getMode().name().toLowerCase());
        response.put("rcon_enabled", rconService.isEnabled());
        response.put("rcon_host", serverConfig.getRcon().getHost());
        response.put("rcon_port", serverConfig.getRcon().getPort());
        
        return ResponseEntity.ok(response);
    }
    
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
    
    private void logAudit(String action, String username, String ip, boolean success, Exception error) {
        log.info("[AUDIT] action={}, username={}, ip={}, success={}, error={}, timestamp={}",
            action, username, ip, success, error != null ? error.getMessage() : null, LocalDateTime.now());
    }
    
    @Data
    public static class AddWhitelistRequest {
        @NotBlank(message = "Username is required")
        private String username;
    }
    
    @Data
    public static class RemoveWhitelistRequest {
        @NotBlank(message = "Username is required")
        private String username;
    }
}
