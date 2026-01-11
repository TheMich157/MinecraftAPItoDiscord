package com.whitelisthub.api.service;

import com.whitelisthub.api.config.ServerConfig;
import com.whitelisthub.api.util.UsernameValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhitelistService {
    
    private final RconService rconService;
    private final ServerConfig serverConfig;
    
    public void addToWhitelist(String username) throws IOException {
        if (!rconService.isEnabled()) {
            throw new IllegalStateException("RCON is required for remote server management");
        }
        
        if (!UsernameValidator.isValid(username)) {
            throw new IllegalArgumentException("Invalid username format. Must be 3-16 alphanumeric characters and underscores.");
        }
        
        String sanitized = UsernameValidator.sanitize(username);
        String command = "whitelist add " + rconService.escapeCommand(sanitized);
        
        String response = rconService.executeCommand(command);
        log.info("Added {} to whitelist via RCON: {}", sanitized, response);
    }
    
    public void removeFromWhitelist(String username) throws IOException {
        if (!rconService.isEnabled()) {
            throw new IllegalStateException("RCON is required for remote server management");
        }
        
        if (!UsernameValidator.isValid(username)) {
            throw new IllegalArgumentException("Invalid username format");
        }
        
        String sanitized = UsernameValidator.sanitize(username);
        String command = "whitelist remove " + rconService.escapeCommand(sanitized);
        
        String response = rconService.executeCommand(command);
        log.info("Removed {} from whitelist via RCON: {}", sanitized, response);
    }
    
    public WhitelistStatus getStatus() throws IOException {
        if (!rconService.isEnabled()) {
            throw new IllegalStateException("RCON is required for remote server management");
        }
        
        String command = "whitelist list";
        String response = rconService.executeCommand(command);
        
        List<String> users = parseWhitelistList(response);
        
        return new WhitelistStatus(users.size(), users, serverConfig.getMode().name().toLowerCase());
    }
    
    private List<String> parseWhitelistList(String response) {
        if (response == null || response.trim().isEmpty()) {
            return new ArrayList<>();
        }
        
        try {
            if (response.contains(":")) {
                String[] parts = response.split(":", 2);
                if (parts.length == 2) {
                    String userList = parts[1].trim();
                    if (!userList.isEmpty() && !userList.equals("There are no whitelisted players")) {
                        String[] userArray = userList.split(",\\s*");
                        return Arrays.stream(userArray)
                            .map(String::trim)
                            .filter(u -> !u.isEmpty())
                            .toList();
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error parsing whitelist response: {}", response, e);
        }
        
        return new ArrayList<>();
    }
    
    public record WhitelistStatus(int count, List<String> users, String mode) {}
}
