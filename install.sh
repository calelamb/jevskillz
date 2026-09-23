#!/usr/bin/env bash
# Links every skill in this pack into ~/.claude/skills so all Claude Code sessions on
# this machine discover them. Source of truth stays in this Desktop folder. Idempotent.
set -euo pipefail
PACK="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.claude/skills"
mkdir -p "$DEST"
for dir in "$PACK"/skills/*/; do
  name="$(basename "$dir")"
  target="$DEST/$name"
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "skip $name: $target exists and is not a symlink" >&2
    continue
  fi
  ln -sfn "${dir%/}" "$target"
  echo "linked $name"
done
BIN="$HOME/.local/bin"
mkdir -p "$BIN"
ln -sfn "$PACK/bin/jev" "$BIN/jev"
echo "linked jev -> $BIN/jev"
case ":$PATH:" in *":$BIN:"*) ;; *) echo "note: add $BIN to PATH" >&2 ;; esac
[ -n "${TYPESAFE_API_KEY:-}" ] || echo "warning: TYPESAFE_API_KEY is not set in this shell" >&2
