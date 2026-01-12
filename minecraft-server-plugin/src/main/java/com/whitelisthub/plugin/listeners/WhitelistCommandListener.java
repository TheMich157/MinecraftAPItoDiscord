package com.whitelisthub.plugin.listeners;

import com.whitelisthub.plugin.WhitelistPlugin;
import org.bukkit.Bukkit;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerCommandPreprocessEvent;
import org.bukkit.event.server.ServerCommandEvent;

import java.util.Locale;

public class WhitelistCommandListener implements Listener {

    private final WhitelistPlugin plugin;

    public WhitelistCommandListener(WhitelistPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler
    public void onPlayerCommand(PlayerCommandPreprocessEvent event) {
        String msg = event.getMessage(); // includes leading '/'
        if (msg == null) return;

        String trimmed = msg.startsWith("/") ? msg.substring(1) : msg;
        if (!trimmed.toLowerCase(Locale.ROOT).startsWith("whitelist")) return;

        Player player = event.getPlayer();
        handleCommand(player, trimmed);
    }

    @EventHandler
    public void onServerCommand(ServerCommandEvent event) {
        String command = event.getCommand(); // console commands
        if (command == null) return;
        if (!command.toLowerCase(Locale.ROOT).startsWith("whitelist")) return;

        CommandSender sender = event.getSender();
        handleCommand(sender, command);
    }

    private void handleCommand(CommandSender sender, String commandLine) {
        String[] parts = commandLine.split("\\s+");
        String action = parts.length > 1 ? parts[1].toLowerCase(Locale.ROOT) : "";
        String target = parts.length > 2 ? parts[2] : null;

        plugin.getLogger().info("[AUDIT] whitelist command by=" + sender.getName() + " action=" + action + (target != null ? " target=" + target : ""));

        // Provide a small in-game animation/feedback for player senders
        if (sender instanceof Player p) {
            // show a short title to indicate the command was received
            p.sendTitle("§6Whitelist", "§eProcessing...", 5, 40, 10);

            // schedule a follow-up message after a short delay
            Bukkit.getScheduler().runTaskLater(plugin, () -> {
                p.sendMessage("§aWhitelist command sent: " + commandLine);
            }, 20L);
        } else {
            sender.sendMessage("Whitelist command detected: " + commandLine);
        }
    }
}
