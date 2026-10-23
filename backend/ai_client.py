"""
AI Client Module for Solvane
Supports Google Gemini (via google-genai) and Anthropic Claude (via anthropic).
Provider is configured via AI_PROVIDER in environment variables.
"""

import os
import logging
from config import AI_PROVIDER, AI_API_KEY, AI_MODEL

logger = logging.getLogger("solvane_ai")

def generate_reply(system_prompt: str, messages: list) -> str:
    """
    Generate an AI reply using the configured provider (Gemini or Claude).
    
    Args:
        system_prompt: The prompt guiding the AI persona, rules, and retrieved knowledge context.
        messages: List of chat message dicts, e.g. [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        
    Returns:
        The generated reply text as a string.
        
    Raises:
        RuntimeError or ValueError on configuration or API errors with sanitized messages.
    """
    provider = (AI_PROVIDER or "gemini").strip().lower()
    api_key = (AI_API_KEY or "").strip()
    
    if not api_key:
        logger.error("AI_API_KEY is not configured in backend environment.")
        raise ValueError("AI service is not configured. Please contact the administrator.")

    # 1. Google Gemini Provider
    if provider == "gemini":
        try:
            from google import genai
            from google.genai import types
        except ImportError:
            logger.error("google-genai package is not installed.")
            raise RuntimeError("Gemini AI client library is unavailable.")

        try:
            # Set up client with API key and default timeout (30 seconds)
            client = genai.Client(api_key=api_key)
            model_name = AI_MODEL or "gemini-3.6-flash"

            # Format conversation history
            contents = []
            for msg in messages:
                role = "user" if msg.get("role") == "user" else "model"
                text = msg.get("content", "").strip()
                if text:
                    contents.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=text)]
                        )
                    )

            if not contents:
                raise ValueError("No valid message content to send to AI.")

            # Generate response with system instruction
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.3,
                max_output_tokens=3000,
            )

            # Candidate models: start with configured model, then fallback if quota/demand limits occur
            models_to_try = [model_name]
            for fb in ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"]:
                if fb not in models_to_try:
                    models_to_try.append(fb)

            response = None
            last_err = None
            for m in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=m,
                        contents=contents,
                        config=config,
                    )
                    if response and response.text:
                        print(f"[AI Guide] Successfully generated response using model '{m}'.", flush=True)
                        break
                except Exception as ex:
                    last_err = ex
                    err_msg = str(ex)
                    # Mask any accidental sensitive fragments
                    clean_err = err_msg.replace(api_key, "[REDACTED]") if api_key else err_msg
                    print(
                        f"[AI Guide] Model '{m}' failed with {type(ex).__name__} ({clean_err[:120]}). Trying next model...",
                        flush=True
                    )
                    if "429" in err_msg or "503" in err_msg or "404" in err_msg or "resource_exhausted" in err_msg.lower():
                        continue
                    raise

            if not response or not response.text:
                if last_err:
                    err_lower = str(last_err).lower()
                    if "429" in err_lower or "resource_exhausted" in err_lower or "quota" in err_lower:
                        user_msg = "AI quota or rate limit exceeded (429). Please wait a moment or check your API quota."
                    elif "503" in err_lower or "unavailable" in err_lower or "high demand" in err_lower:
                        user_msg = "AI service is currently experiencing high demand (503). Please try again in a moment."
                    elif "401" in err_lower or "403" in err_lower or "api_key_invalid" in err_lower:
                        user_msg = "AI API key authentication failed (401/403). Please check AI_API_KEY in backend/.env."
                    elif "connect" in err_lower or "getaddrinfo" in err_lower:
                        user_msg = "Cannot connect to AI service. Please verify server internet connectivity."
                    else:
                        user_msg = f"AI service error: {type(last_err).__name__}"

                    print(f"[AI Guide Failure] All model attempts failed. Reason: {user_msg}", flush=True)
                    raise RuntimeError(user_msg)

                raise RuntimeError("Empty response received from AI model.")

            return response.text.strip()

        except RuntimeError:
            raise
        except Exception as e:
            err_str = str(e)
            clean_err = err_str.replace(api_key, "[REDACTED]") if api_key else err_str
            print(f"[AI Guide Error] Gemini invocation failed: {type(e).__name__} - {clean_err[:150]}", flush=True)
            raise RuntimeError(f"AI guide unavailable: {type(e).__name__}")

    # 2. Anthropic Claude Provider
    elif provider == "claude":
        try:
            import anthropic
        except ImportError:
            logger.error("anthropic package is not installed.")
            raise RuntimeError("Claude AI client library is unavailable.")

        try:
            client = anthropic.Anthropic(api_key=api_key, timeout=30.0)
            model_name = AI_MODEL or "claude-3-5-haiku-20241022"

            # Format conversation history
            claude_messages = []
            for msg in messages:
                role = "user" if msg.get("role") == "user" else "assistant"
                text = msg.get("content", "").strip()
                if text:
                    claude_messages.append({
                        "role": role,
                        "content": text
                    })

            if not claude_messages:
                raise ValueError("No valid message content to send to AI.")

            response = client.messages.create(
                model=model_name,
                system=system_prompt,
                messages=claude_messages,
                max_tokens=800,
                temperature=0.3,
            )

            # Extract response text
            if response.content and len(response.content) > 0:
                reply_text = "".join([block.text for block in response.content if hasattr(block, "text")])
                return reply_text.strip()
            else:
                raise RuntimeError("Empty response received from Claude AI.")

        except Exception as e:
            logger.error(f"Claude API invocation error: {type(e).__name__} - {str(e)[:200]}")
            raise RuntimeError("The AI guide is temporarily unavailable. Please try again in a moment.")

    else:
        logger.error(f"Unsupported AI_PROVIDER: {provider}")
        raise ValueError(f"Unsupported AI provider '{provider}'. Must be 'gemini' or 'claude'.")
