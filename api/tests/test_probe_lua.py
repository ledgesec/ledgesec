import importlib.util
from pathlib import Path


def test_lua_probe_list_is_generated_from_classify():
    root = Path(__file__).resolve().parents[2]
    script = root / "packages" / "customer-gate" / "scripts" / "emit_probes.py"
    spec = importlib.util.spec_from_file_location("emit_probes", script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    generated = module.render()
    committed = (root / "packages" / "customer-gate" / "module" / "ledgesec" / "probes.lua").read_text()
    assert generated == committed
