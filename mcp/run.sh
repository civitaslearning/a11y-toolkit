#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# run from the mcp-accessiblity subdir
cd $SCRIPT_DIR || exit

npm run dev
