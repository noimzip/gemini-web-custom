const petStopSelector = [
  ".send-button.stop", '[data-test-id="stop-response-button"]',
  'button:has(.stop-icon, [fonticon="stop"], [fonticonname="stop"])',
  'button[aria-label="Stop response"]', 'button[aria-label="応答を停止"]',
  'button[aria-label="回答を停止"]', 'button[aria-label="回答の生成を停止"]'
].join(", ");

function watchPetChat(onAnimation) {
  let chat;
  let path = location.pathname.replace(/\/$/, "");
  let generating = false;
  let canceled = false;
  let waitingTurn;
  let previousError;
  let animation = "idle";
  let frame;
  let settle;

  function show(next) {
    if (next === animation) return;
    clearTimeout(settle);
    animation = next;
    onAnimation(next);
    if (next === "review" || next === "failed") {
      const lap = petAnimations[next].durations.reduce((total, duration) => total + duration, 0);
      settle = setTimeout(() => show("idle"), 3 * lap);
    }
  }

  function update() {
    frame = null;
    const nextPath = location.pathname.replace(/\/$/, "");
    // A new chat can acquire its URL while the first response is still streaming.
    const assignedChat = generating && path.endsWith("/app") && nextPath.startsWith(`${path}/`);
    if (path !== nextPath && !assignedChat) {
      generating = false;
      canceled = false;
      waitingTurn = null;
      previousError = null;
      show("idle");
    }
    path = nextPath;

    chat = document.querySelector("chat-window");
    const turn = Array.from(chat?.querySelectorAll(".conversation-container") ?? []).at(-1);
    const markdown = Array.from(turn?.querySelectorAll("model-response message-content .markdown-main-panel") ?? []).at(-1);
    const stop = chat?.querySelector("input-area-v2")?.querySelector(petStopSelector);
    const wasGenerating = generating;
    const pending = turn?.querySelector("pending-request, optimistic-steering-thinking");
    generating = Boolean(stop?.getClientRects().length || pending?.getClientRects().length
      || markdown?.getAttribute("aria-busy") === "true");
    if (generating && !wasGenerating) canceled = false;

    const approvalActions = turn?.querySelectorAll([
      'agentic-confirmation-widget [data-test-id="action-button"]',
      'remy-confirmation-card [data-test-id="primary-button"]',
      'deep-research-confirmation-widget [data-test-id="confirm-button"]'
    ].join(", "));
    const awaitsApproval = Array.from(approvalActions ?? []).some(action => {
      const button = action.matches("button") ? action : action.querySelector("button");
      return button?.matches(':not(:disabled):not([aria-disabled="true"])') && button.getClientRects().length;
    });
    if (awaitsApproval) {
      waitingTurn = null;
      show("waiting");
      return;
    }

    const error = turn?.querySelector('response-failure-notice, [data-test-id="response-failure-notice"], .inline-failure-row');
    if (generating) {
      waitingTurn = null;
      previousError = null;
      show("running");
      return;
    }

    if (canceled) {
      canceled = false;
      previousError = error;
      show("idle");
      return;
    }

    if (error?.getClientRects().length) {
      if (error !== previousError) show("failed");
      previousError = error;
      return;
    }
    previousError = null;

    if (wasGenerating) {
      const lastParagraph = markdown?.lastElementChild;
      // Treat a final prose question as a request for a reply. Structured cards take precedence.
      if (lastParagraph?.matches("p") && /[?？]$/.test(lastParagraph.textContent.trimEnd())) {
        waitingTurn = turn;
        show("waiting");
      } else {
        show(markdown?.childElementCount || turn?.querySelector("model-response message-content") ? "review" : "idle");
      }
    } else if (animation === "waiting" && (!waitingTurn || waitingTurn !== turn)) {
      show("idle");
    }
  }

  function schedule() {
    if (frame == null) frame = requestAnimationFrame(update);
  }

  function stopClicked(event) {
    if (event.target instanceof Element && event.target.closest("chat-window input-area-v2")
        && event.target.closest(petStopSelector)) canceled = true;
  }

  const observer = new MutationObserver(records => {
    if (!chat?.isConnected || records.some(record => chat.contains(record.target))) schedule();
  });
  observer.observe(document.body, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ["aria-busy", "aria-label", "aria-disabled", "class", "disabled", "hidden"]
  });
  document.addEventListener("click", stopClicked, true);
  navigation.addEventListener("currententrychange", schedule);
  update();

  return () => {
    observer.disconnect();
    document.removeEventListener("click", stopClicked, true);
    navigation.removeEventListener("currententrychange", schedule);
    cancelAnimationFrame(frame);
    clearTimeout(settle);
  };
}
