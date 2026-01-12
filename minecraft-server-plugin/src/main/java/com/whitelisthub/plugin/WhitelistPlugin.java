package com.whitelisthub.plugin;

import org.bukkit.plugin.java.JavaPlugin;
import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.logging.Level;

public final class WhitelistPlugin extends JavaPlugin {

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
    }

    @Override
    public void onDisable() {
        getLogger().info("WhitelistHub plugin disabled");
    }
}
