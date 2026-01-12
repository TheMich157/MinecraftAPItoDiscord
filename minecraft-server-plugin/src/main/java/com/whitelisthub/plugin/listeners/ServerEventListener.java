package com.whitelisthub.plugin.listeners;

import com.whitelisthub.plugin.WhitelistPlugin;
import com.whitelisthub.plugin.WsBridge;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerChatEvent;
import org.bukkit.event.player.PlayerCommandPreprocessEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.server.ServerCommandEvent;

public final class ServerEventListener implements Listener {

    private final WhitelistPlugin plugin;

    public ServerEventListener(WhitelistPlugin plugin) {
        this.plugin = plugin;
    }

    private WsBridge bridge() {
        return plugin.getWsBridge();
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent event) {
        WsBridge ws = bridge();
        if (ws == null) return;
        String name = event.getPlayer().getName();
        ws.sendEvent("player_join", "{\"player\":" + jsonString(name) + "}");
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        WsBridge ws = bridge();
        if (ws == null) return;
        String name = event.getPlayer().getName();
        ws.sendEvent("player_quit", "{\"player\":" + jsonString(name) + "}");
    }

    @EventHandler
    public void onChat(AsyncPlayerChatEvent event) {
        WsBridge ws = bridge();
        if (ws == null) return;
        String name = event.getPlayer().getName();
        String msg = event.getMessage();
        ws.sendEvent("chat", "{\"player\":" + jsonString(name) + ",\"message\":" + jsonString(msg) + "}");
    }

    @EventHandler
    public void onPlayerCommand(PlayerCommandPreprocessEvent event) {
        WsBridge ws = bridge();
        if (ws == null) return;
        String name = event.getPlayer().getName();
        String cmd = event.getMessage();
        ws.sendEvent("player_command", "{\"player\":" + jsonString(name) + ",\"command\":" + jsonString(cmd) + "}");
    }

    @EventHandler
    public void onServerCommand(ServerCommandEvent event) {
        WsBridge ws = bridge();
        if (ws == null) return;
        String sender = event.getSender() != null ? event.getSender().getName() : "console";
        String cmd = event.getCommand();
        ws.sendEvent("server_command", "{\"sender\":" + jsonString(sender) + ",\"command\":" + jsonString(cmd) + "}");
    }

    private static String jsonString(String s) {
        if (s == null) return "\"\"";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
    }
}
