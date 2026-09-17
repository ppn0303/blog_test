(function () {
  "use strict";

  const data = window.TEST_DATA;
  const state = { current: 0, answers: Array(data.questions.length).fill(null), moving: false };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const screens = {
    intro: $("#intro-screen"),
    quiz: $("#quiz-screen"),
    result: $("#result-screen")
  };

  function showScreen(name) {
    Object.entries(screens).forEach(([key, element]) => {
      element.hidden = key !== name;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetTest() {
    state.current = 0;
    state.answers.fill(null);
    state.moving = false;
    renderQuestion();
    showScreen("intro");
  }

  function startTest() {
    state.current = 0;
    renderQuestion();
    showScreen("quiz");
    $("#question-text").focus({ preventScroll: true });
  }

  function renderQuestion() {
    const question = data.questions[state.current];
    const category = data.categories[question.category];
    const progress = ((state.current + 1) / data.questions.length) * 100;

    $("#progress-text").textContent = `${state.current + 1} / ${data.questions.length}`;
    $("#progress-bar").style.width = `${progress}%`;
    $("#category-letter").textContent = question.category;
    $("#category-name").textContent = category.name;
    $("#question-number").textContent = `QUESTION ${String(state.current + 1).padStart(2, "0")}`;
    $("#question-text").textContent = question.text;
    $("#question-text").setAttribute("tabindex", "-1");

    const note = $("#question-note");
    note.hidden = !question.note;
    note.textContent = question.note || "";

    $$(".answer-button").forEach((button) => {
      const selected = Number(button.dataset.score) === state.answers[state.current];
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    $("#previous-button").disabled = state.current === 0;
  }

  function chooseAnswer(score, button) {
    if (state.moving) return;
    state.answers[state.current] = score;
    $$(".answer-button").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });

    state.moving = true;
    window.setTimeout(() => {
      if (state.current === data.questions.length - 1) {
        renderResult();
        showScreen("result");
        $("#result-title").focus({ preventScroll: true });
      } else {
        state.current += 1;
        renderQuestion();
        $("#question-text").focus({ preventScroll: true });
      }
      state.moving = false;
    }, 180);
  }

  function previousQuestion() {
    if (state.current === 0 || state.moving) return;
    state.current -= 1;
    renderQuestion();
    $("#question-text").focus({ preventScroll: true });
  }

  function scoresByCategory() {
    return data.questions.reduce(
      (scores, question, index) => {
        scores[question.category] += state.answers[index] || 0;
        return scores;
      },
      { A: 0, B: 0, C: 0, D: 0, E: 0 }
    );
  }

  function familiarityBand(score) {
    if (score <= 3) return "온라인 관광객";
    if (score <= 7) return "가벼운 눈팅러";
    if (score <= 11) return "커뮤 생활권 주민";
    return "커뮤 통역사";
  }

  function influenceBand(score) {
    if (score <= 14) return "거리두기 양호";
    if (score <= 29) return "일부 영향권";
    if (score <= 44) return "커뮤 필터 상시 작동";
    return "현실의 커뮤화";
  }

  function profileType(familiarity, influence) {
    const familiar = familiarity >= 8;
    const affected = influence >= 30;
    if (!familiar && !affected) {
      return {
        title: "현실 우선형",
        summary: "커뮤니티 문법에 깊이 들어가 있지 않고, 온라인 반응과 현실 판단 사이에도 대체로 거리를 두는 편입니다. 다만 영역별로 높게 나온 패턴은 별도로 확인할 필요가 있습니다."
      };
    }
    if (familiar && !affected) {
      return {
        title: "숙련된 거리두기형",
        summary: "온라인 문법과 흐름에는 익숙하지만, 그것을 현실의 사실이나 다수 의견과 곧바로 동일시하지는 않는 편입니다. 잘 알면서도 거리를 두는 사용자에 가깝습니다."
      };
    }
    if (!familiar && affected) {
      return {
        title: "알고리즘 침투형",
        summary: "전통적인 커뮤니티 이용은 많지 않아도 추천 피드와 댓글의 반응이 관심사와 판단에 들어오는 편입니다. 요즘형 ‘커뮤 경험’에 가까운 유형입니다."
      };
    }
    return {
      title: "커뮤 현실화형",
      summary: "온라인 문법에 익숙하고, 그 공간의 반응·갈등 구도가 현실 판단과 감정에도 자주 이어지는 편입니다. 사실과 반응을 의식적으로 분리하는 습관이 도움이 됩니다."
    };
  }

  function dominantPattern(scores) {
    const riskKeys = ["B", "C", "D", "E"];
    const highest = riskKeys.reduce((best, key) => (scores[key] > scores[best] ? key : best), "B");
    if (scores[highest] < 6) {
      return {
        heading: "뚜렷하게 높은 취약 영역은 없습니다",
        description: "네 가지 영향 영역이 모두 낮은 편입니다. 지금의 거리두기 습관을 유지하되, 큰 논란을 접했을 때만 출처와 반대 근거를 한 번 더 확인해 보세요."
      };
    }
    const labels = {
      B: "알고리즘·댓글 의존형",
      C: "정보 검증 취약형",
      D: "집단 프레임 취약형",
      E: "현실생활 침투형"
    };
    return {
      heading: `가장 눈에 띄는 패턴: ${labels[highest]}`,
      description: data.categories[highest].description
    };
  }

  function renderRadar(scores) {
    const keys = ["A", "B", "C", "D", "E"];
    const cx = 150;
    const cy = 143;
    const radius = 90;
    const angleFor = (index) => -Math.PI / 2 + (Math.PI * 2 * index) / keys.length;
    const point = (index, ratio) => {
      const angle = angleFor(index);
      return `${(cx + Math.cos(angle) * radius * ratio).toFixed(1)},${(cy + Math.sin(angle) * radius * ratio).toFixed(1)}`;
    };
    const rings = [0.33, 0.66, 1]
      .map((ratio) => `<polygon points="${keys.map((_, i) => point(i, ratio)).join(" ")}" />`)
      .join("");
    const axes = keys
      .map((_, i) => `<line x1="${cx}" y1="${cy}" x2="${point(i, 1).split(",")[0]}" y2="${point(i, 1).split(",")[1]}" />`)
      .join("");
    const values = keys.map((key, i) => point(i, scores[key] / 15)).join(" ");
    const labelPositions = keys.map((key, i) => {
      const angle = angleFor(i);
      const x = cx + Math.cos(angle) * 120;
      const y = cy + Math.sin(angle) * 112;
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle"><tspan>${key} · ${data.categories[key].short}</tspan><tspan x="${x.toFixed(1)}" dy="16">${scores[key]}/15</tspan></text>`;
    }).join("");

    $("#radar-chart").innerHTML = `
      <svg viewBox="0 0 300 286" aria-hidden="true">
        <g class="radar-grid">${rings}${axes}</g>
        <polygon class="radar-value" points="${values}" />
        <g class="radar-points">${keys.map((key, i) => {
          const [x, y] = point(i, scores[key] / 15).split(",");
          return `<circle cx="${x}" cy="${y}" r="4" />`;
        }).join("")}</g>
        <g class="radar-labels">${labelPositions}</g>
      </svg>`;
    $("#radar-chart").setAttribute(
      "aria-label",
      keys.map((key) => `${data.categories[key].name} ${scores[key]}점`).join(", ")
    );
  }

  function renderResult() {
    const scores = scoresByCategory();
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const influence = scores.B + scores.C + scores.D + scores.E;
    const profile = profileType(scores.A, influence);
    const dominant = dominantPattern(scores);

    $("#result-title").textContent = profile.title;
    $("#result-title").setAttribute("tabindex", "-1");
    $("#result-summary").textContent = profile.summary;
    $("#total-score").textContent = total;
    $("#overall-percent").textContent = `${Math.round((total / 75) * 100)}%`;
    $("#familiarity-label").textContent = familiarityBand(scores.A);
    $("#familiarity-score").textContent = `${scores.A} / 15`;
    $("#influence-label").textContent = influenceBand(influence);
    $("#influence-score").textContent = `${influence} / 60`;
    $("#dominant-heading").textContent = dominant.heading;
    $("#dominant-description").textContent = dominant.description;

    const highRisk = ["B", "C", "D", "E"].filter((key) => scores[key] >= 9);
    $("#risk-badges").innerHTML = highRisk.length
      ? `<span class="badge-label">높게 나온 영역</span>${highRisk.map((key) => `<span class="risk-badge">${data.categories[key].short} ${scores[key]}/15</span>`).join("")}`
      : `<span class="risk-badge calm">두드러지게 높은 영향 영역 없음</span>`;

    $("#domain-bars").innerHTML = Object.keys(data.categories).map((key) => {
      const category = data.categories[key];
      const percentage = Math.round((scores[key] / 15) * 100);
      return `
        <div class="domain-row">
          <div class="domain-meta">
            <span><b>${key}</b> ${category.name}</span>
            <strong>${scores[key]}<small>/15</small></strong>
          </div>
          <div class="domain-track"><span style="width:${percentage}%"></span></div>
          <p>${category.description}</p>
        </div>`;
    }).join("");

    $("#answers-list").innerHTML = data.questions.map((question, index) => `
      <li>
        <span><b>${index + 1}.</b> ${question.text}</span>
        <strong>${state.answers[index]} · ${data.answerLabels[state.answers[index]]}</strong>
      </li>`).join("");

    renderRadar(scores);
    window.latestResult = { scores, total, influence, profile };
  }

  async function shareResult() {
    const result = window.latestResult;
    if (!result) return;
    const highRisk = ["B", "C", "D", "E"]
      .filter((key) => result.scores[key] >= 9)
      .map((key) => data.categories[key].short)
      .join("·");
    const text = [
      `나의 커뮤 체질은 ‘${result.profile.title}’`,
      `친숙도 ${result.scores.A}/15 · 판단·생활 침투도 ${result.influence}/60`,
      highRisk ? `높게 나온 영역: ${highRisk}` : "두드러지게 높은 영향 영역 없음",
      "커뮤 체질 검사"
    ].join("\n");
    const shareData = { title: "커뮤 체질 검사", text, url: window.location.href };
    const status = $("#share-status");

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        status.textContent = "공유 창을 열었습니다.";
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
        status.textContent = "결과를 클립보드에 복사했습니다.";
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        status.textContent = "공유하지 못했습니다. 주소창의 링크를 복사해 주세요.";
      }
    }
  }

  $("#start-button").addEventListener("click", startTest);
  $("#quit-button").addEventListener("click", resetTest);
  $("#restart-button").addEventListener("click", resetTest);
  $("#previous-button").addEventListener("click", previousQuestion);
  $("#share-button").addEventListener("click", shareResult);
  $$(".answer-button").forEach((button) => {
    button.addEventListener("click", () => chooseAnswer(Number(button.dataset.score), button));
  });
})();
