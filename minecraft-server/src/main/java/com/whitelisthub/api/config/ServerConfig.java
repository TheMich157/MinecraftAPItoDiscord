package com.whitelisthub.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

@Data
@Configuration
@ConfigurationProperties(prefix = "minecraft.server")
@Validated
public class ServerConfig {
    
    @NotBlank(message = "API key is required")
    private String apiKey;
    
    @Min(1)
    @Max(65535)
    private int port = 3003;
    
    @NotBlank(message = "Server root directory is required")
    private String serverRoot;
    
    private String configFolder;
    
    private String whitelistFile = "whitelist.json";
    
    private String opsFile = "ops.json";
    
    private String bannedPlayersFile = "banned-players.json";
    
    private ServerMode mode = ServerMode.ONLINE;
    
    private RconConfig rcon = new RconConfig();
    
    @Data
    public static class RconConfig {
        private boolean enabled = false;
        private String host = "localhost";
        
        @Min(1)
        @Max(65535)
        private int port = 25575;
        
        private String password = "";
    }
    
    public enum ServerMode {
        ONLINE, OFFLINE
    }
}
