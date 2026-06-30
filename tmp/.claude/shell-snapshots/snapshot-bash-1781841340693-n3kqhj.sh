# Snapshot file
# Unset all aliases to avoid conflicts with functions
unalias -a 2>/dev/null || true
shopt -s expand_aliases
# Check for rg availability
if ! (unalias rg 2>/dev/null; command -v rg) >/dev/null 2>&1; then
  function rg {
  local _cc_bin="${CLAUDE_CODE_EXECPATH:-}"
  [[ -x $_cc_bin ]] || _cc_bin=/c/Users/HP/.local/bin/claude.exe
  if [[ ! -x $_cc_bin ]]; then command rg ${1+"$@"}; return; fi
  if [[ -n ${ZSH_VERSION:-} ]]; then
    ARGV0=rg "$_cc_bin" ${1+"$@"}
  elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    ARGV0=rg "$_cc_bin" ${1+"$@"}
  else
    (exec -a rg "$_cc_bin" ${1+"$@"})
  fi
}
fi
export PATH='/c/Users/HP/bin:/mingw64/bin:/usr/local/bin:/usr/bin:/bin:/mingw64/bin:/usr/bin:/c/Users/HP/bin:/c/Users/HP/AppData/Roaming/Code/User/globalStorage/github.copilot-chat/debugCommand:/c/Users/HP/AppData/Roaming/Code/User/globalStorage/github.copilot-chat/copilotCli:/c/WINDOWS/system32:/c/WINDOWS:/c/WINDOWS/System32/Wbem:/c/WINDOWS/System32/WindowsPowerShell/v1.0:/c/WINDOWS/System32/OpenSSH:/c/MinGW/bin:/cmd:/c/Program Files/GitHub CLI:/c/Program Files/nodejs:/c/Program Files/MySQL/MySQL Shell 8.0/bin:/c/Users/HP/AppData/Local/Programs/cursor/resources/app/codeBin:/c/Users/HP/AppData/Local/Microsoft/WindowsApps:/c/Users/HP/AppData/Local/Programs/Microsoft VS Code/bin:/c/Users/HP/AppData/Local/Programs/Antigravity/bin:/c/Users/HP/AppData/Local/Programs/cursor/resources/app/bin:/c/Users/HP/AppData/Local/Programs/Antigravity IDE/bin:/c/Users/HP/AppData/Roaming/npm:/usr/bin/vendor_perl:/usr/bin/core_perl:/c/Users/HP/.claude/plugins/cache/contribute-marketplace/contribute/1.0.0/bin'
