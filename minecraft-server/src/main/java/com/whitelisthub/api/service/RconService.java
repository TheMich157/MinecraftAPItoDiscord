package com.whitelisthub.api.service;

import com.whitelisthub.api.config.ServerConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

@Slf4j
@Service
@RequiredArgsConstructor
public class RconService {
    
    private final ServerConfig serverConfig;
    
    public boolean isEnabled() {
        return serverConfig.getRcon().isEnabled();
    }
    
    public String executeCommand(String command) throws IOException {
        if (!isEnabled()) {
            throw new IllegalStateException("RCON is not enabled");
        }
        
        ServerConfig.RconConfig rcon = serverConfig.getRcon();
        
        try (Socket socket = new Socket(rcon.getHost(), rcon.getPort())) {
            socket.setSoTimeout(5000);
            
            DataInputStream input = new DataInputStream(socket.getInputStream());
            DataOutputStream output = new DataOutputStream(socket.getOutputStream());
            
            int requestId = authenticate(input, output, rcon.getPassword());
            if (requestId == -1) {
                throw new IOException("RCON authentication failed");
            }
            
            return sendCommand(input, output, requestId, command);
        }
    }
    
    private int authenticate(DataInputStream input, DataOutputStream output, String password) throws IOException {
        int requestId = (int) (Math.random() * Integer.MAX_VALUE);
        
        byte[] packet = createPacket(requestId, 3, password);
        output.write(packet);
        output.flush();
        
        RconPacket response = readPacket(input);
        
        if (response.requestId == requestId && response.type == 2) {
            log.debug("RCON authenticated successfully");
            return requestId;
        }
        
        return -1;
    }
    
    private String sendCommand(DataInputStream input, DataOutputStream output, int requestId, String command) throws IOException {
        byte[] packet = createPacket(requestId, 2, command);
        output.write(packet);
        output.flush();
        
        RconPacket response = readPacket(input);
        
        if (response.requestId == requestId && response.type == 0) {
            return new String(response.body, java.nio.charset.StandardCharsets.UTF_8).trim();
        }
        
        return "";
    }
    
    private byte[] createPacket(int requestId, int type, String body) {
        byte[] bodyBytes = body.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        int packetSize = 4 + 4 + bodyBytes.length + 2;
        
        ByteBuffer buffer = ByteBuffer.allocate(4 + packetSize);
        buffer.order(ByteOrder.LITTLE_ENDIAN);
        buffer.putInt(packetSize);
        buffer.putInt(requestId);
        buffer.putInt(type);
        buffer.put(bodyBytes);
        buffer.put((byte) 0);
        buffer.put((byte) 0);
        
        return buffer.array();
    }
    
    private RconPacket readPacket(DataInputStream input) throws IOException {
        int length = Integer.reverseBytes(input.readInt());
        
        byte[] data = new byte[length];
        input.readFully(data);
        
        ByteBuffer buffer = ByteBuffer.wrap(data);
        buffer.order(ByteOrder.LITTLE_ENDIAN);
        
        int requestId = buffer.getInt();
        int type = buffer.getInt();
        
        byte[] body = new byte[length - 8];
        buffer.get(body);
        
        return new RconPacket(requestId, type, body);
    }
    
    private record RconPacket(int requestId, int type, byte[] body) {}
    
    public String escapeCommand(String command) {
        if (command == null) {
            return "";
        }
        return command.replaceAll("[^a-zA-Z0-9_\\-\\s.]", "");
    }
}
