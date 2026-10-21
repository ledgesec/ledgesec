"""Write the Lua probe matcher from api.app.observation.markers.RULES."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "api"))

from app.observation.markers import RULES  # noqa: E402


def lua_string(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def lua_list(values: tuple[str, ...]) -> str:
    return ", ".join(lua_string(value) for value in values)


def render() -> str:
    rows = []
    for rule in RULES:
        rows.append(
            "  {\n"
            f"    exact = {{ {lua_list(rule.exact)} }},\n"
            f"    prefixes = {{ {lua_list(rule.prefixes)} }},\n"
            f"    suffixes = {{ {lua_list(rule.suffixes)} }},\n"
            f"    contains = {{ {lua_list(rule.contains)} }},\n"
            "  },"
        )
    body = "\n".join(rows)
    return f"""-- Generated from api/app/observation/markers.py. Do not edit.
local M = {{}}

local rules = {{
{body}
}}

local function has_prefix(path, prefix)
  return string.sub(path, 1, #prefix) == prefix
end

local function has_suffix(path, suffix)
  return #path >= #suffix and string.sub(path, -#suffix) == suffix
end

function M.is_probe(path)
  path = string.lower(path or "")
  for _, rule in ipairs(rules) do
    for _, item in ipairs(rule.exact) do
      if path == item then return true end
    end
    for _, item in ipairs(rule.prefixes) do
      if has_prefix(path, item) then return true end
    end
    for _, item in ipairs(rule.suffixes) do
      if has_suffix(path, item) then return true end
    end
    for _, item in ipairs(rule.contains) do
      if string.find(path, item, 1, true) then return true end
    end
  end
  return false
end

return M
"""


def main() -> None:
    sys.stdout.write(render())


if __name__ == "__main__":
    main()
