package com.whitelisthub.api.service;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import com.whitelisthub.api.config.ServerConfig;
import com.whitelisthub.api.model.WhitelistEntry;
import com.whitelisthub.api.util.UuidGenerator;
import com.whitelisthub.api.util.UsernameValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

@Slf4j
@Service
@RequiredArgsConstructor
public class WhitelistService {
    
    private final ServerConfig serverConfig;
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    private final ReentrantLock fileLock = new ReentrantLock();
    
    private Path getWhitelistPath() {
        Path serverRoot = Paths.get(serverConfig.getServerRoot());
        Path whitelistFile = Paths.get(serverConfig.getWhitelistFile());
        
        if (whitelistFile.isAbsolute()) {
            return whitelistFile;
        }
        return serverRoot.resolve(whitelistFile).normalize();
    }
    
    private void validatePath(Path filePath) {
        Path serverRoot = Paths.get(serverConfig.getServerRoot()).normalize();
        Path normalized = filePath.normalize();
        
        if (!normalized.startsWith(serverRoot)) {
            throw new SecurityException("File path must be within server root directory");
        }
    }
    
    public List<WhitelistEntry> readWhitelist() throws IOException {
        Path whitelistPath = getWhitelistPath();
        validatePath(whitelistPath);
        
        if (!Files.exists(whitelistPath)) {
            log.warn("Whitelist file not found at: {}", whitelistPath);
            throw new IOException("Whitelist file not found: " + whitelistPath);
        }
        
        String content = Files.readString(whitelistPath);
        List<WhitelistEntry> entries = gson.fromJson(content, 
            new TypeToken<List<WhitelistEntry>>(){}.getType());
        
        if (entries == null) {
            return new ArrayList<>();
        }
        
        return entries;
    }
    
    public void writeWhitelist(List<WhitelistEntry> entries) throws IOException {
        Path whitelistPath = getWhitelistPath();
        validatePath(whitelistPath);
        
        Path parentDir = whitelistPath.getParent();
        if (parentDir != null && !Files.exists(parentDir)) {
            Files.createDirectories(parentDir);
        }
        
        String json = gson.toJson(entries);
        Files.writeString(whitelistPath, json);
    }
    
    public WhitelistEntry addToWhitelist(String username) throws IOException {
        if (!UsernameValidator.isValid(username)) {
            throw new IllegalArgumentException("Invalid username format. Must be 3-16 alphanumeric characters and underscores.");
        }
        
        fileLock.lock();
        try {
            List<WhitelistEntry> entries = readWhitelist();
            
            String sanitized = UsernameValidator.sanitize(username);
            boolean exists = entries.stream()
                .anyMatch(entry -> entry.getName() != null && 
                    entry.getName().equalsIgnoreCase(sanitized));
            
            if (exists) {
                throw new IllegalStateException("User already whitelisted: " + sanitized);
            }
            
            UUID uuid;
            if (serverConfig.getMode() == ServerConfig.ServerMode.OFFLINE) {
                uuid = UuidGenerator.generateOfflineUUID(sanitized);
            } else {
                uuid = UuidGenerator.generateOfflineUUID(sanitized);
            }
            
            WhitelistEntry newEntry = new WhitelistEntry(
                UuidGenerator.uuidToString(uuid),
                sanitized
            );
            
            entries.add(newEntry);
            writeWhitelist(entries);
            
            log.info("Added {} to whitelist (UUID: {})", sanitized, uuid);
            return newEntry;
        } finally {
            fileLock.unlock();
        }
    }
    
    public void removeFromWhitelist(String username) throws IOException {
        if (!UsernameValidator.isValid(username)) {
            throw new IllegalArgumentException("Invalid username format");
        }
        
        fileLock.lock();
        try {
            List<WhitelistEntry> entries = readWhitelist();
            String sanitized = UsernameValidator.sanitize(username);
            
            int initialSize = entries.size();
            entries.removeIf(entry -> 
                entry.getName() != null && entry.getName().equalsIgnoreCase(sanitized));
            
            if (entries.size() == initialSize) {
                throw new IllegalStateException("User not found in whitelist: " + sanitized);
            }
            
            writeWhitelist(entries);
            log.info("Removed {} from whitelist", sanitized);
        } finally {
            fileLock.unlock();
        }
    }
    
    public WhitelistStatus getStatus() throws IOException {
        List<WhitelistEntry> entries = readWhitelist();
        List<String> usernames = entries.stream()
            .map(WhitelistEntry::getName)
            .filter(name -> name != null && !name.isEmpty())
            .toList();
        
        return new WhitelistStatus(entries.size(), usernames, serverConfig.getMode().name().toLowerCase());
    }
    
    public record WhitelistStatus(int count, List<String> users, String mode) {}
}
