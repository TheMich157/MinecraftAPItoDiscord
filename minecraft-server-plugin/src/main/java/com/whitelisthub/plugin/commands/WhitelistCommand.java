package com.whitelisthub.plugin.commands;

import com.whitelisthub.plugin.WhitelistPlugin;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.ConsoleCommandSender;
import org.bukkit.entity.Player;

import java.util.Arrays;
import java.util.stream.Collectors;

public class WhitelistCommand implements CommandExecutor {

    private final WhitelistPlugin plugin;

    public WhitelistCommand(WhitelistPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 0) {
            sender.sendMessage("§eUsage: /whitelisthub <add|remove|list|reload> [player]");
            return true;
        }

        String sub = args[0].toLowerCase();

        switch (sub) {
            case "add":
                if (args.length < 2) {
                    sender.sendMessage("§cUsage: /whitelisthub add <player>");
                    return true;
                }
                handleAdd(sender, args[1]);
                return true;

            case "remove":
            case "del":
                if (args.length < 2) {
                    sender.sendMessage("§cUsage: /whitelisthub remove <player>");
                    return true;
                }
                handleRemove(sender, args[1]);
                return true;

            case "list":
                handleList(sender);
                return true;

            case "reload":
                handleReload(sender);
                return true;

            default:
                sender.sendMessage("§cUnknown subcommand. Use add/remove/list/reload");
                return true;
        }
    }

    private void handleAdd(CommandSender sender, String name) {
        OfflinePlayer op = Bukkit.getOfflinePlayerIfCached(name);
        if (op == null) op = Bukkit.getOfflinePlayer(name);
        op.setWhitelisted(true);
        sender.sendMessage("§aPlayer " + name + " has been whitelisted.");
        plugin.getLogger().info("Whitelisted player: " + name + " by " + sender.getName());
    }

    private void handleRemove(CommandSender sender, String name) {
        OfflinePlayer op = Bukkit.getOfflinePlayerIfCached(name);
        if (op == null) op = Bukkit.getOfflinePlayer(name);
        op.setWhitelisted(false);
        sender.sendMessage("§aPlayer " + name + " has been removed from whitelist.");
        plugin.getLogger().info("Removed whitelist for player: " + name + " by " + sender.getName());
    }

    private void handleList(CommandSender sender) {
        var players = Bukkit.getWhitelistedPlayers();
        if (players.isEmpty()) {
            sender.sendMessage("§eNo whitelisted players.");
            return;
        }
        String list = players.stream().map(OfflinePlayer::getName).filter(n -> n != null).collect(Collectors.joining(", "));
        sender.sendMessage("§aWhitelisted players: " + list);
    }

    private void handleReload(CommandSender sender) {
        Bukkit.reloadWhitelist();
        sender.sendMessage("§aWhitelist reloaded.");
        plugin.getLogger().info("Whitelist reloaded by " + sender.getName());
    }
}
