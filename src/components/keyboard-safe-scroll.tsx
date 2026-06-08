"use client";

import { useEffect } from "react";

const keyboardClassName = "keyboard-open";
const focusableSelector = "input, textarea, select, [contenteditable='true']";

export function KeyboardSafeScroll() {
  useEffect(() => {
    let resizeTimer: number | undefined;

    function isEditableElement(target: EventTarget | null): target is HTMLElement {
      return target instanceof HTMLElement && target.matches(focusableSelector);
    }

    function keyboardHeight() {
      if (!window.visualViewport) return 0;
      return Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop);
    }

    function updateKeyboardClass() {
      const open = keyboardHeight() > 120;
      document.documentElement.classList.toggle(keyboardClassName, open);
      document.body.classList.toggle(keyboardClassName, open);
    }

    function scrollFocusedField() {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !active.matches(focusableSelector)) return;

      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const rect = active.getBoundingClientRect();
      const safeBottom = Math.min(viewportHeight - 96, window.innerHeight - keyboardHeight() - 96);
      const hiddenBelowKeyboard = rect.bottom > safeBottom;
      const tooCloseToTop = rect.top < 96;

      if (!hiddenBelowKeyboard && !tooCloseToTop) return;
      active.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    function scheduleScroll() {
      updateKeyboardClass();
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(scrollFocusedField, 120);
    }

    function handleFocusIn(event: FocusEvent) {
      if (!isEditableElement(event.target)) return;
      window.setTimeout(scrollFocusedField, 180);
      window.setTimeout(scrollFocusedField, 420);
    }

    document.addEventListener("focusin", handleFocusIn);
    window.visualViewport?.addEventListener("resize", scheduleScroll);
    window.visualViewport?.addEventListener("scroll", scheduleScroll);
    window.addEventListener("resize", scheduleScroll);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      window.visualViewport?.removeEventListener("resize", scheduleScroll);
      window.visualViewport?.removeEventListener("scroll", scheduleScroll);
      window.removeEventListener("resize", scheduleScroll);
      window.clearTimeout(resizeTimer);
      document.documentElement.classList.remove(keyboardClassName);
      document.body.classList.remove(keyboardClassName);
    };
  }, []);

  return null;
}
