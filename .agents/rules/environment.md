# PowerShell Environment Rule

This project is being developed on a **Windows** environment using **PowerShell**.

## Command Syntax Rules

- **DO NOT** use `&&` to chain commands (e.g., `command1 && command2`).
- **USE** `;` to chain commands (e.g., `command1 ; command2`).
- When running Prisma commands, always specify the schema path if necessary: `npx prisma db push --schema prisma/schema.prisma`.

## Shell Details
- **Shell**: PowerShell (Windows)
- **Primary Terminal**: Windows Terminal / PowerShell 7+
- **Root Directory**: `c:\Users\Christian\Documents\restaurante-pedidos`
