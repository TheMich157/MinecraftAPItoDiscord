package com.whitelisthub.plugin;

import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.atomic.AtomicBoolean;

public final class WsBridge {

    private final WhitelistPlugin plugin;
    private final String backendUrl;
    private final String apiKey;
    private final String serverId;

    private volatile WebSocket ws;
    private final AtomicBoolean started = new AtomicBoolean(false);
    private final AtomicBoolean authed = new AtomicBoolean(false);

    public WsBridge(WhitelistPlugin plugin, String backendUrl, String apiKey, String serverId) {
        this.plugin = Objects.requireNonNull(plugin, "plugin");
        this.backendUrl = Objects.requireNonNull(backendUrl, "backendUrl");
        this.apiKey = Objects.requireNonNull(apiKey, "apiKey");
        this.serverId = serverId == null ? "default" : serverId;
    }

    public boolean isReady() {
        return started.get() && authed.get() && ws != null;
    }

    public void sendEvent(String eventType, String payloadJsonObject) {
        if (!isReady()) return;
        if (eventType == null || eventType.isBlank()) return;
        String payload = payloadJsonObject == null || payloadJsonObject.isBlank() ? "{}" : payloadJsonObject;
        String msg = "{\"type\":\"event\",\"eventType\":" + jsonString(eventType) + ",\"payload\":" + payload + ",\"serverId\":" + jsonString(serverId) + "}";
        try {
            ws.sendText(msg, true);
        } catch (Exception ignored) {
        }
    }

    public void sendState(String payloadJsonObject) {
        if (!isReady()) return;
        String payload = payloadJsonObject == null || payloadJsonObject.isBlank() ? "{}" : payloadJsonObject;
        String msg = "{\"type\":\"state\",\"payload\":" + payload + ",\"serverId\":" + jsonString(serverId) + "}";
        try {
            ws.sendText(msg, true);
        } catch (Exception ignored) {
        }
    }

    public void start() {
        if (!started.compareAndSet(false, true)) return;

        HttpClient client = HttpClient.newHttpClient();
        CompletableFuture<WebSocket> fut = client.newWebSocketBuilder().buildAsync(URI.create(backendUrl), new Listener());
        fut.whenComplete((socket, err) -> {
            if (err != null) {
                plugin.getLogger().severe("Failed to connect to backend WS: " + err.getMessage());
                return;
            }
            ws = socket;
        });
    }

    public void stop() {
        started.set(false);
        authed.set(false);
        WebSocket socket = ws;
        ws = null;
        if (socket != null) {
            try {
                socket.sendClose(WebSocket.NORMAL_CLOSURE, "bye");
            } catch (Exception ignored) {
            }
        }
    }

    private final class Listener implements WebSocket.Listener {

        private final StringBuilder buffer = new StringBuilder();

        @Override
        public void onOpen(WebSocket webSocket) {
            webSocket.request(1);
            authed.set(false);
            String auth = "{\"type\":\"auth\",\"apiKey\":" + jsonString(apiKey) + ",\"serverId\":" + jsonString(serverId) + "}";
            webSocket.sendText(auth, true);
        }

        @Override
        public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
            buffer.append(data);
            if (last) {
                String msg = buffer.toString();
                buffer.setLength(0);
                handleMessage(msg);
            }
            webSocket.request(1);
            return null;
        }

        @Override
        public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
            if (started.get()) {
                Bukkit.getScheduler().runTaskLater(plugin, () -> {
                    if (started.get()) {
                        started.set(false);
                        start();
                    }
                }, 60L);
            }
            return WebSocket.Listener.super.onClose(webSocket, statusCode, reason);
        }

        @Override
        public void onError(WebSocket webSocket, Throwable error) {
            plugin.getLogger().warning("WS error: " + (error.getMessage() == null ? error.toString() : error.getMessage()));
        }

        private void handleMessage(String json) {
            String type = extractJsonString(json, "type");
            if (type == null) return;

            if ("auth_result".equals(type)) {
                if (json.contains("\"ok\":true") || json.contains("\"ok\":1")) {
                    authed.set(true);
                } else {
                    authed.set(false);
                }
                return;
            }

            if ("whitelist_add".equals(type)) {
                String username = extractJsonString(json, "username");
                if (username == null || username.isBlank()) return;
                Bukkit.getScheduler().runTask(plugin, () -> whitelistSet(username.trim(), true));
                return;
            }

            if ("whitelist_remove".equals(type)) {
                String username = extractJsonString(json, "username");
                if (username == null || username.isBlank()) return;
                Bukkit.getScheduler().runTask(plugin, () -> whitelistSet(username.trim(), false));
            }
        }

        private void whitelistSet(String name, boolean whitelisted) {
            OfflinePlayer op = Bukkit.getOfflinePlayerIfCached(name);
            if (op == null) op = Bukkit.getOfflinePlayer(name);
            op.setWhitelisted(whitelisted);
            if (whitelisted) {
                plugin.getLogger().info("Whitelisted player via WS: " + name);
            } else {
                plugin.getLogger().info("Removed whitelist via WS: " + name);
            }
        }
    }

    private static String extractJsonString(String json, String key) {
        if (json == null) return null;
        String needle = "\"" + key + "\"";
        int idx = json.indexOf(needle);
        if (idx < 0) return null;
        int colon = json.indexOf(':', idx + needle.length());
        if (colon < 0) return null;
        int firstQuote = json.indexOf('"', colon + 1);
        if (firstQuote < 0) return null;
        int i = firstQuote + 1;
        StringBuilder out = new StringBuilder();
        while (i < json.length()) {
            char c = json.charAt(i);
            if (c == '\\') {
                if (i + 1 < json.length()) {
                    char n = json.charAt(i + 1);
                    if (n == '"' || n == '\\' || n == '/') {
                        out.append(n);
                        i += 2;
                        continue;
                    }
                    if (n == 'n') {
                        out.append('\n');
                        i += 2;
                        continue;
                    }
                    if (n == 'r') {
                        out.append('\r');
                        i += 2;
                        continue;
                    }
                    if (n == 't') {
                        out.append('\t');
                        i += 2;
                        continue;
                    }
                }
                i++;
                continue;
            }
            if (c == '"') break;
            out.append(c);
            i++;
        }
        return out.toString();
    }

    private static String jsonString(String s) {
        if (s == null) return "\"\"";
        byte[] bytes = s.getBytes(StandardCharsets.UTF_8);
        StringBuilder sb = new StringBuilder();
        sb.append('"');
        for (byte b : bytes) {
            char c = (char) (b & 0xFF);
            if (c == '\\') sb.append("\\\\");
            else if (c == '"') sb.append("\\\"");
            else if (c == '\n') sb.append("\\n");
            else if (c == '\r') sb.append("\\r");
            else if (c == '\t') sb.append("\\t");
            else sb.append(c);
        }
        sb.append('"');
        return sb.toString();
    }
}
