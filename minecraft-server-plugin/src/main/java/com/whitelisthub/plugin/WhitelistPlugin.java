package com.whitelisthub.plugin;

import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;

import java.util.stream.Collectors;
import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.logging.Level;

public final class WhitelistPlugin extends JavaPlugin {

    private WsBridge wsBridge;
    private int stateTaskId = -1;

    public WsBridge getWsBridge() {
        return wsBridge;
    }

    @Override
    public void onEnable() {
        saveDefaultConfig();
        getLogger().info("WhitelistHub plugin enabled");

        File dataFolder = getDataFolder();
        if (!dataFolder.exists()) dataFolder.mkdirs();

        // Extract example files bundled in the plugin to the plugin data folder
        try (InputStream in = getResource("example-files/whitelist.json")) {
            if (in != null) {
                File out = new File(dataFolder, "whitelist.json");
                if (!out.exists()) {
                    Files.copy(in, out.toPath(), StandardCopyOption.REPLACE_EXISTING);
                }
            }
        } catch (Exception e) {
            getLogger().log(Level.SEVERE, "Failed to extract example files", e);
        }

        // Register event listener to monitor legacy 'whitelist' command usage
        try {
            getServer().getPluginManager().registerEvents(
                new com.whitelisthub.plugin.listeners.WhitelistCommandListener(this),
                this
            );
        } catch (NoClassDefFoundError e) {
            getLogger().warning("Could not register listeners due to API mismatch: " + e.getMessage());
        }

        String backendUrl = getConfig().getString("backend-url", "").trim();
        String apiKey = getConfig().getString("api-key", "").trim();
        String serverId = getConfig().getString("server-id", "default").trim();

        if (!backendUrl.isEmpty() && !apiKey.isEmpty()) {
            wsBridge = new WsBridge(this, backendUrl, apiKey, serverId);
            wsBridge.start();
        }

        try {
            getServer().getPluginManager().registerEvents(
                new com.whitelisthub.plugin.listeners.ServerEventListener(this),
                this
            );
        } catch (NoClassDefFoundError e) {
            getLogger().warning("Could not register server event listener: " + e.getMessage());
        }

        stateTaskId = Bukkit.getScheduler().scheduleSyncRepeatingTask(this, this::sendStateSnapshot, 40L, 200L);
    }

    @Override
    public void onDisable() {
        if (stateTaskId != -1) {
            Bukkit.getScheduler().cancelTask(stateTaskId);
            stateTaskId = -1;
        }
        if (wsBridge != null) {
            wsBridge.stop();
            wsBridge = null;
        }
        getLogger().info("WhitelistHub plugin disabled");
    }

    private void sendStateSnapshot() {
        if (wsBridge == null || !wsBridge.isReady()) return;

        String players = Bukkit.getOnlinePlayers().stream()
            .map(p -> p.getName())
            .filter(n -> n != null)
            .map(this::jsonString)
            .collect(Collectors.joining(","));

        String whitelist = Bukkit.getWhitelistedPlayers().stream()
            .map(OfflinePlayer::getName)
            .filter(n -> n != null)
            .map(this::jsonString)
            .collect(Collectors.joining(","));

        int online = Bukkit.getOnlinePlayers().size();
        int whitelisted = Bukkit.getWhitelistedPlayers().size();

        String payload = "{\"onlineCount\":" + online + ",\"whitelistCount\":" + whitelisted + ",\"onlinePlayers\":[" + players + "],\"whitelist\":[" + whitelist + "]}";
        wsBridge.sendState(payload);
    }

    private String jsonString(String s) {
        if (s == null) return "\"\"";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
    }
}
