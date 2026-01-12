Minecraft folder consolidation

This folder is a lightweight consolidation point for the existing Minecraft modules in the repository.

Current layout in repository:
- `minecraft-server/` - Java-based API server and related code
- `minecraft-server-plugin/` - Server plugin project

Next steps to physically move the projects under this folder (optional):
1. Move `minecraft-server/` -> `minecraft/server/`
2. Move `minecraft-server-plugin/` -> `minecraft/plugin/`
3. Update any CI/build scripts and references that expect the old paths.

I did not perform automatic moves to avoid breaking builds; tell me if you want me to move these directories and update references automatically.
