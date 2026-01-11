package com.whitelisthub.api.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;

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
    
    private ServerMode mode = ServerMode.ONLINE;
    
    @NotNull(message = "RCON configuration is required")
    @Valid
    private RconConfig rcon = new RconConfig();
    
    @Data
    public static class RconConfig {
        private boolean enabled = true;
        
        @NotBlank(message = "RCON host is required")
        private String host = "localhost";
        
        @Min(1)
        @Max(65535)
        private int port = 25575;
        
        @NotBlank(message = "RCON password is required")
        private String password = "";
    }
    
    public enum ServerMode {
        ONLINE, OFFLINE
    }
}
