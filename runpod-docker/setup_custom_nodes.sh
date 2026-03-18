#!/bin/bash
set -e

CUSTOM_NODES_DIR="/workspace/ComfyUI/custom_nodes"
mkdir -p "${CUSTOM_NODES_DIR}"

echo ">>> Installing custom nodes..."
while IFS= read -r node || [ -n "$node" ]; do
    node=$(echo "$node" | xargs)
    [ -z "$node" ] && continue
    [ "${node:0:1}" = "#" ] && continue
    
    name=$(basename "$node")
    echo "  Cloning: $node -> $name"
    git clone --depth 1 "https://github.com/$node" "${CUSTOM_NODES_DIR}/$name" || {
        echo "  WARNING: Failed to clone $node"
        continue
    }
done < /workspace/custom_nodes.list

echo ">>> Custom nodes installed!"
