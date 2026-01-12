# WhitelistHub Minecraft Plugin

This combined Paper/Bukkit plugin contains both the lightweight plugin scaffolding and a copy of the original API module's configuration and utility helpers.

What changed
- `application.yml` (API sample) is included in the plugin resources so the plugin can export or reference default API configuration when creating files on enable.
- `UsernameValidator` and `UuidGenerator` utilities were copied into `com.whitelisthub.plugin.util` so the plugin can validate usernames and generate offline Minecraft UUIDs.

Building the plugin

1. Install JDK 17 and Maven on your build machine.
2. From the `minecraft-server-plugin` folder run:

```bash
mvn -U clean package
```

3. The resulting plugin jar will be at `minecraft-server-plugin/target/minecraft-whitelist-plugin-1.0.0.jar`.

Install

1. Copy the produced jar to your Paper/Bukkit server `plugins/` folder.
2. Start the server — the plugin will create its data folder and write default `config.yml` and example files (including the bundled `application.yml`) on first run.

Notes

- The original Spring Boot API code was not converted to run inside the plugin — the plugin ships API sample config and helper utilities for local use. If you want the full API server, run the `minecraft-server` module separately as a Spring Boot application.
- Building the plugin requires Maven; if Maven is not available on your server machine you can build the jar on a developer machine and copy the jar into `plugins/`.

