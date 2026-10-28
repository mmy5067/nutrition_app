# app/llm_client.py
from __future__ import annotations
import os
import requests
from typing import List, Dict, Any
from .config import get_settings

class LLMError(RuntimeError):
    pass

def _get_config():
    s = get_settings()
    api_key = s.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY")
    base_url = s.OPENAI_BASE_URL or os.getenv("OPENAI_BASE_URL")
    model = s.MODEL_NAME or os.getenv("MODEL_NAME")
    if not api_key:
        raise LLMError("LLM API key not configured")
    return api_key, base_url.rstrip("/"), model

def chat(messages: List[Dict[str, str]], **extra) -> str:
    """
    通用聊天调用：传入 messages = [{"role":"system","content":...},...]
    返回模型回复的 content 字符串。
    """
    api_key, base_url, model = _get_config()
    url = f"{base_url}/chat/completions"

    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": extra.get("temperature", 0.5),
        "max_tokens": extra.get("max_tokens", 512),
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    resp = requests.post(url, json=payload, headers=headers, timeout=30)
    if resp.status_code != 200:
        raise LLMError(f"LLM API error {resp.status_code}: {resp.text[:200]}")
    data = resp.json()
    try:
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        raise LLMError(f"Invalid LLM response: {e}; raw={data}")
