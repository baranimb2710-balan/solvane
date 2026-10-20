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
                max_output_tokens=800,
            )

            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )

            if not response or not response.text:
                raise RuntimeError("Empty response received from Gemini AI.")

            return response.text.strip()

        except Exception as e:
            # Never print or leak the API key in logs
            logger.error(f"Gemini API invocation error: {type(e).__name__} - {str(e)[:200]}")
            raise RuntimeError("The AI guide is temporarily unavailable. Please try again in a moment.")

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
