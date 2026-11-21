import asyncio
import json
from copy import deepcopy

import pytest
import yaml

from app.config import Settings
from app.experiments.run import atomic_write, run_experiment, sha256, summarize, summarize_directory
from app.infrastructure.llm import FakeLLMProvider, LLMMetadata, LLMProviderError, LLMResult

SECRET = "test-only-super-secret-key"
CV = "Built REST APIs."


@pytest.fixture
def fixture(tmp_path):
    (tmp_path / "text").mkdir()
    (tmp_path / "jds").mkdir()
    source_pdf_sha256 = sha256(b"source PDF fixture bytes")
    text = tmp_path / "text" / f"{source_pdf_sha256}.txt"
    text.write_text(CV)
    jd = {
        "id": "jd-a",
        "title": "Backend",
        "summary": "Build APIs",
        "criteria": [
            {
                "code": "api",
                "label": "API",
                "description": "Build APIs",
                "priority": "must_have",
                "weight": 100,
                "keywords": ["API"],
            }
        ],
    }
    (tmp_path / "jds/jd-a.yaml").write_text(yaml.safe_dump(jd))
    eval_set = tmp_path / "set.yaml"
    eval_set.write_text(
        yaml.safe_dump(
            {
                "cvs": [
                    {
                        "sheet_id": "cv-1",
                        "text_sha256": source_pdf_sha256,
                        "expected_group": "match_A",
                    },
                    {
                        "sheet_id": "cv-2",
                        "text_sha256": source_pdf_sha256,
                        "expected_group": "none",
                    },
                ]
            }
        )
    )
    args = {
        "eval_set": eval_set,
        "jd_ids": ["jd-a"],
        "output_dir": tmp_path / "run",
        "concurrency": 1,
        "settings": Settings(
            _env_file=None,
            llm_base_url="https://example.invalid",
            llm_api_key=SECRET,
            llm_model="requested",
        ),
    }
    return args, text


def response():
    return LLMResult.model_construct(
        value={
            "criteria": [
                {
                    "criterion_id": "api",
                    "level": "strong",
                    "confidence": 1,
                    "reason": SECRET,
                    "evidence": [{"quote": CV}],
                    "missing_information": [],
                }
            ]
        },
        raw_text=SECRET,
        metadata=LLMMetadata(
            provider="fake",
            model="requested",
            response_model="reported",
            temperature=0,
            started_at="2026-11-21T00:00:00Z",
            latency_ms=12,
            input_tokens=10,
            output_tokens=20,
            attempts=1,
        ),
    )


def run(args, responses, **kwargs):
    return asyncio.run(run_experiment(**(args | kwargs), provider=FakeLLMProvider(responses)))


def test_resume_skips_success_retries_failure_and_redacts(fixture):
    args, _ = fixture
    first = run(args, [response(), LLMProviderError(f"Failure {SECRET}")])
    assert first["succeeded"] == 1
    assert first["failures"][0]["class"] == "LLMProviderError"
    assert first["failures"][0]["message"] == "Failure [REDACTED]"
    pair = args["output_dir"] / "pairs/cv-1__jd-a.json"
    original = pair.read_bytes()
    second = run(args, [response()])
    assert second["succeeded"] == 2
    assert pair.read_bytes() == original
    assert second["tokens"]["total"] == 60
    assert second["quote_verification"] == {"valid": 2, "total": 2, "rate": 1}
    manifest = json.loads((args["output_dir"] / "manifest.json").read_text())
    assert manifest["text_content_sha256"] == {
        "cv-1": sha256(CV.encode()),
        "cv-2": sha256(CV.encode()),
    }
    saved_pair = json.loads(original)
    assert saved_pair["source_pdf_sha256"] == sha256(b"source PDF fixture bytes")
    assert saved_pair["text_content_sha256"] == sha256(CV.encode())
    assert "text_sha256" not in saved_pair
    assert manifest["gateway_reported_models"] == ["reported"]
    assert manifest["identity"]["requested_model"] == "requested"
    assert manifest["ended_at"] >= manifest["started_at"]
    assert len(manifest["invocations"]) == 2
    for path in args["output_dir"].rglob("*"):
        if path.is_file():
            assert SECRET not in path.read_text()
    assert not list(args["output_dir"].rglob(".writing-*"))


def test_missing_text_is_pair_failure_even_on_resume(fixture):
    args, text = fixture
    run(args, [response(), response()])
    text.unlink()
    summary = run(args, [])
    assert summary["succeeded"] == 0
    assert len(summary["failures"]) == 2
    assert {e["class"] for e in summary["failures"]} == {"FileNotFoundError"}
    assert summary["latency_s"]["p50"] is None
    assert summary["quote_verification"]["rate"] is None


def test_summary_math_and_missing_scores(fixture):
    args, _ = fixture
    run(args, [response(), response()])
    pair = json.loads((args["output_dir"] / "pairs/cv-1__jd-a.json").read_text())
    pairs = [deepcopy(pair) for _ in range(4)]
    for i, p in enumerate(pairs):
        p["latency_s"] = [1, 2, 3, 10][i]
        p["result"]["total"]["observed_score"] = [20, 80, None, 50][i]
    pairs[-1]["result"]["criteria"][0]["evidence"][0]["verification"]["valid"] = False
    summary = summarize(pairs)
    assert summary["latency_s"]["p50"] == 2.5
    assert summary["latency_s"]["p95"] == pytest.approx(8.95)
    assert summary["latency_s"]["max"] == 10
    assert summary["tokens"]["total"] == 120
    assert summary["quote_verification"] == {"valid": 3, "total": 4, "rate": 0.75}
    assert summary["group_scores_not_accuracy"][0] == {
        "expected_group": "match_A",
        "jd_id": "jd-a",
        "count": 4,
        "scored_count": 3,
        "mean": 50,
        "median": 50,
        "coverage_mean": pytest.approx(pair["result"]["total"]["coverage"]),
        "coverage_median": pytest.approx(pair["result"]["total"]["coverage"]),
        "known_only_score_mean": pytest.approx(pair["result"]["total"]["observed_score"]),
        "known_only_score_median": pytest.approx(pair["result"]["total"]["observed_score"]),
    }


def test_known_only_score_and_all_unknown(fixture):
    args, _ = fixture
    run(args, [response(), response()])
    pair = json.loads((args["output_dir"] / "pairs/cv-1__jd-a.json").read_text())
    result = pair["result"]
    result["criteria"] = [
        {"evidence": [], "scoring": {"weight": 2, "match_value": 0.5}},
        {"evidence": [], "scoring": {"weight": 1, "match_value": 1.0}},
        {"evidence": [], "scoring": {"weight": 7, "match_value": None}},
    ]
    pair["result"]["total"].update(
        coverage=0.3, score_state="insufficient_coverage", observed_score=None
    )
    summary = summarize([pair])
    assert summary["pairs"][0]["known_only_score"] == 66.67
    assert summary["pairs"][0]["score"] is None
    assert summary["pairs"][0]["coverage"] == 0.3
    result["criteria"] = [{"evidence": [], "scoring": {"weight": 1, "match_value": None}}]
    assert summarize([pair])["pairs"][0]["known_only_score"] is None


def test_summarize_directory_preserves_pair_files(fixture):
    args, _ = fixture
    run(args, [response(), response()])
    paths = sorted((args["output_dir"] / "pairs").glob("*.json"))
    before = {path: path.read_bytes() for path in paths}
    summary = summarize_directory(args["output_dir"])
    assert summary["pair_count"] == 2
    assert {path: path.read_bytes() for path in paths} == before


def test_limit_and_resume_identity(fixture):
    args, _ = fixture
    assert run(args, [response()], limit=1)["pair_count"] == 1
    assert run(args, [response()])["succeeded"] == 2
    with pytest.raises(ValueError, match="Resume inputs"):
        run(args, [], context_mode="retrieved")
    with pytest.raises(ValueError, match="positive"):
        run(args, [], concurrency=0)


def test_retrieved_and_concurrency_cap(fixture):
    args, _ = fixture

    class TrackingProvider(FakeLLMProvider):
        active = 0
        maximum = 0

        async def generate_structured(self, **kwargs):
            self.active += 1
            self.maximum = max(self.maximum, self.active)
            await asyncio.sleep(0.01)
            try:
                return await super().generate_structured(**kwargs)
            finally:
                self.active -= 1

    provider = TrackingProvider([response(), response()])
    summary = asyncio.run(run_experiment(**args, provider=provider, context_mode="retrieved"))
    assert summary["succeeded"] == 2
    assert provider.maximum == 1


def test_atomic_write_preserves_previous_on_replace_failure(tmp_path, monkeypatch):
    path = tmp_path / "result.json"
    path.write_text("previous")

    def fail(*args):
        raise OSError("disk failure")

    monkeypatch.setattr("app.experiments.run.os.replace", fail)
    with pytest.raises(OSError):
        atomic_write(path, "new")
    assert path.read_text() == "previous"
    assert list(tmp_path.iterdir()) == [path]


def test_changed_text_is_not_reused_and_new_content_hash_is_recorded(fixture):
    args, text = fixture
    run(args, [response(), response()])
    text.write_text(CV + "\nAdditional canonical text.")
    summary = run(args, [response(), response()])
    assert summary["succeeded"] == 2
    expected = sha256(text.read_bytes())
    manifest = json.loads((args["output_dir"] / "manifest.json").read_text())
    assert set(manifest["text_content_sha256"].values()) == {expected}
    for pair_path in (args["output_dir"] / "pairs").glob("*.json"):
        pair = json.loads(pair_path.read_text())
        assert pair["text_content_sha256"] == expected
        assert pair["source_pdf_sha256"] == sha256(b"source PDF fixture bytes")


def test_unreported_gateway_model_is_not_replaced_by_requested_model(fixture):
    args, _ = fixture
    scripted = response()
    scripted.metadata.response_model = None
    run(args, [scripted, scripted])
    manifest = json.loads((args["output_dir"] / "manifest.json").read_text())
    assert manifest["identity"]["requested_model"] == "requested"
    assert manifest["gateway_reported_models"] == []


def test_model_override_is_run_local_and_resume_refuses_different_model(fixture, monkeypatch):
    args, _ = fixture
    seen = []

    def factory(settings):
        seen.append(settings.llm_model)
        return FakeLLMProvider([response(), response()])

    monkeypatch.setattr("app.experiments.run.get_llm_provider", factory)
    asyncio.run(run_experiment(**args, model="override"))
    assert seen == ["override"]
    assert args["settings"].llm_model == "requested"
    manifest = json.loads((args["output_dir"] / "manifest.json").read_text())
    assert manifest["identity"]["requested_model"] == "override"
    pair = json.loads((args["output_dir"] / "pairs/cv-1__jd-a.json").read_text())
    assert pair["prompt_char_length"] > len(CV)
    assert pair["input_tokens"] == 10
    assert pair["output_tokens"] == 20
    assert pair["reasoning_tokens"] is None
    with pytest.raises(ValueError, match="Resume inputs/config/model differ"):
        asyncio.run(run_experiment(**args, model="different"))


def test_measurement_reads_exposed_reasoning_details():
    from types import SimpleNamespace

    from app.experiments.run import MeasuredProvider

    scripted = response()
    scripted.metadata = SimpleNamespace(
        model_dump=lambda: {
            "input_tokens": 10,
            "output_tokens": 20,
            "completion_tokens_details": {"reasoning_tokens": 7},
        }
    )

    class ExposedMetadataProvider(FakeLLMProvider):
        async def generate_structured(self, **kwargs):
            return scripted

    measured = MeasuredProvider(ExposedMetadataProvider([]))
    asyncio.run(
        measured.generate_structured(
            system="abc", user=json.dumps({"cv_context": "défg"}), response_model=None
        )
    )
    assert measured.measurements == {
        "prompt_char_length": 3 + len(json.dumps({"cv_context": "défg"})),
        "context_char_length": 4,
        "input_tokens": 10,
        "output_tokens": 20,
        "reasoning_tokens": 7,
    }


def test_comparison_math_and_preserves_inputs(fixture, tmp_path):
    from app.experiments.compare import compare_runs

    args, _ = fixture
    run(args, [response(), response()])
    baseline = args["output_dir"]
    other = tmp_path / "other"
    (other / "pairs").mkdir(parents=True)
    (other / "manifest.json").write_bytes((baseline / "manifest.json").read_bytes())
    for index, path in enumerate(sorted((baseline / "pairs").glob("*.json"))):
        pair = json.loads(path.read_text())
        pair["latency_s"] = [20, 60][index]
        pair["result"]["total"].update(coverage=[0.4, 0.8][index], score_state="changed")
        pair["result"]["criteria"][0]["scoring"]["match_value"] = [0.4, None][index]
        if index:
            pair["result"]["criteria"][0]["evidence"][0]["verification"]["valid"] = False
        (other / "pairs" / path.name).write_text(json.dumps(pair))
    before = {p: p.read_bytes() for p in baseline.rglob("*") if p.is_file()}
    result = compare_runs([baseline, other], tmp_path / "comparison")
    compared = result["runs"][1]
    assert compared["succeeded"] == 2
    assert compared["latency_s"]["p50"] == 40
    assert compared["latency_s"]["p95"] == 58
    assert compared["latency_s"]["max"] == 60
    assert compared["latency_s"]["within_40_s"] == 1
    assert compared["tokens"]["total"] == 60
    assert compared["tokens"]["reasoning"] is None
    assert compared["quote_verification"]["rate"] == 0.5
    assert compared["mean_coverage"] == pytest.approx(0.6)
    vs = compared["versus_baseline"]
    assert [p["coverage_delta"] for p in vs["pairs"]] == pytest.approx([-0.6, -0.2])
    assert vs["score_state_agreement"] == {"count": 0, "compared": 2, "rate": 0}
    assert vs["known_only_score"] == {"both_known_pairs": 1, "mean_absolute_difference": 60}
    assert {p: p.read_bytes() for p in before} == before
    assert "not accuracy" in (tmp_path / "comparison/comparison.md").read_text()
    assert (tmp_path / "comparison/comparison.json").exists()
    with pytest.raises(ValueError, match="outside input"):
        compare_runs([baseline], baseline)


def test_comparison_excludes_failed_and_missing_pairs(fixture, tmp_path):
    from app.experiments.compare import compare_runs

    args, _ = fixture
    run(args, [response(), response()])
    other_args = args | {"output_dir": tmp_path / "failed"}
    run(other_args, [LLMProviderError("unavailable")], limit=1)
    result = compare_runs([args["output_dir"], other_args["output_dir"]], tmp_path / "comparison")
    compared = result["runs"][1]
    assert compared["succeeded"] == 0
    assert compared["mean_coverage"] is None
    assert compared["latency_s"]["p50"] is None
    assert compared["versus_baseline"]["score_state_agreement"] == {
        "count": 0,
        "compared": 0,
        "rate": None,
    }
    assert compared["versus_baseline"]["known_only_score"] == {
        "both_known_pairs": 0,
        "mean_absolute_difference": None,
    }
    assert len(compared["versus_baseline"]["pairs"]) == 2
    assert all(p["coverage_delta"] is None for p in compared["versus_baseline"]["pairs"])


@pytest.mark.parametrize("mode", ["lexical", "dense", "hybrid"])
def test_retrieval_configuration_shared_embedder_and_context(fixture, monkeypatch, mode):
    from app.embeddings import FakeEmbedder
    from app.experiments import run as runner

    args, _ = fixture
    created, used = [], []

    def factory():
        embedder = FakeEmbedder()
        created.append(embedder)
        return embedder

    original_screen = runner.screen

    async def capture(*args, **kwargs):
        used.append(kwargs["embedder"])
        return await original_screen(*args, **kwargs)

    monkeypatch.setattr(runner, "BgeM3Embedder", factory)
    monkeypatch.setattr(runner, "screen", capture)
    summary = run(
        args, [response(), response()], context_mode="retrieved", retrieval_mode=mode, retrieval_k=2
    )
    assert summary["succeeded"] == 2
    assert len(created) == (0 if mode == "lexical" else 1)
    assert all(value is (created[0] if created else None) for value in used)
    identity = json.loads((args["output_dir"] / "manifest.json").read_text())["identity"]
    assert identity["config"]["retrieval_mode"] == mode
    assert identity["config"]["retrieval_k"] == 2
    assert identity["embedding_model_id"] == ("fake-sha256" if created else None)
    for path in (args["output_dir"] / "pairs").glob("*.json"):
        assert json.loads(path.read_text())["context_char_length"] == (
            0 if mode == "lexical" else len(CV)
        )
    for changed in (
        {"retrieval_k": 3},
        {"retrieval_mode": "hybrid" if mode != "hybrid" else "dense"},
    ):
        with pytest.raises(ValueError, match="Resume inputs"):
            run(
                args,
                [],
                **(
                    {"context_mode": "retrieved", "retrieval_mode": mode, "retrieval_k": 2}
                    | changed
                ),
            )
    if mode != "lexical":
        monkeypatch.setattr(FakeEmbedder, "model_id", "different-model")
        with pytest.raises(ValueError, match="Resume inputs"):
            run(args, [], context_mode="retrieved", retrieval_mode=mode, retrieval_k=2)


def test_full_context_length_and_no_embedder(fixture, monkeypatch):
    def forbidden():
        pytest.fail("full or lexical mode must not construct an embedder")

    monkeypatch.setattr("app.experiments.run.BgeM3Embedder", forbidden)
    args, _ = fixture
    run(args, [response(), response()])
    pair = json.loads((args["output_dir"] / "pairs/cv-1__jd-a.json").read_text())
    assert pair["context_char_length"] == len(CV)
    with pytest.raises(ValueError):
        run(args, [], retrieval_k=0)


def test_cli_retrieval_flags(fixture, monkeypatch):
    import sys

    from app.embeddings import FakeEmbedder
    from app.experiments.run import main

    args, _ = fixture
    monkeypatch.setattr("app.experiments.run.BgeM3Embedder", FakeEmbedder)
    monkeypatch.setattr("app.experiments.run.Settings", lambda: args["settings"])
    monkeypatch.setattr(
        "app.experiments.run.get_llm_provider", lambda _: FakeLLMProvider([response(), response()])
    )
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "run",
            "--eval-set",
            str(args["eval_set"]),
            "--jd-ids",
            "jd-a",
            "--output-dir",
            str(args["output_dir"]),
            "--context-mode",
            "retrieved",
            "--retrieval-mode",
            "dense",
            "--retrieval-k",
            "3",
        ],
    )
    assert main() == 0
    identity = json.loads((args["output_dir"] / "manifest.json").read_text())["identity"]
    assert identity["config"]["retrieval_mode"] == "dense"
    assert identity["config"]["retrieval_k"] == 3
    assert identity["embedding_model_id"] == "fake-sha256"


def test_comparison_context_reduction_and_missing_measurements(fixture, tmp_path):
    from app.experiments.compare import compare_runs, context_length

    args, _ = fixture
    run(args, [response(), response()])
    other_args = args | {"output_dir": tmp_path / "other"}
    run(other_args, [response(), response()])
    for path in (other_args["output_dir"] / "pairs").glob("*.json"):
        pair = json.loads(path.read_text())
        pair["context_char_length"] = 3
        path.write_text(json.dumps(pair))
    result = compare_runs([args["output_dir"], other_args["output_dir"]], tmp_path / "comparison")
    assert result["runs"][0]["context_chars"]["mean"] == len(CV)
    assert result["runs"][1]["context_chars"]["mean"] == 3
    assert result["runs"][1]["context_chars"]["reduction_vs_baseline"] == pytest.approx(
        1 - 3 / len(CV)
    )
    pair.pop("context_char_length")
    manifest = {"identity": {"config": {"context_mode": "full"}}}
    assert context_length(pair, tmp_path / "runs/historical", manifest) == (
        len(CV),
        "verified_full_input",
    )
    pair["text_content_sha256"] = "changed"
    assert context_length(pair, tmp_path / "runs/historical", manifest) == (None, None)
    manifest["identity"]["config"]["context_mode"] = "retrieved"
    assert context_length(pair, tmp_path / "runs/historical", manifest) == (None, None)
