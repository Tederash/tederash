// @vitest-environment jsdom
import { MockSpeechRecognition } from "./e2e/setup/test-globals";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent, act, waitFor } from "@testing-library/react";
import {
  DEFAULT_PROFILE,
  AMHARIC_PRESET,
  VOICE_ASSIST_PRESET,
  createAccessibilityRuntime,
  type TederashProfile,
} from "@tederash/react";
import { renderWithA11y } from "./e2e/setup/test-harness";
import { AccessibleDialog, AccessibleInput, AccessibleTextarea } from "../src";

const withSpeech = (
  speech: NonNullable<TederashProfile["speech"]>,
  base: TederashProfile = DEFAULT_PROFILE
): TederashProfile => ({ ...base, speech: { ...base.speech, ...speech } });

const DICTATION_PROFILE = withSpeech({ speechInput: true, language: "en-GB" });
const READ_ALOUD_PROFILE = withSpeech({ speechOutput: true, language: "en-GB", speechRate: 0.8 });

function ControlledInput(props: Partial<React.ComponentProps<typeof AccessibleInput>>) {
  const [value, setValue] = React.useState("");
  return (
    <>
      <AccessibleInput
        id="full-name"
        label="Full name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        speechInput
        speechOutput
        {...props}
      />
      {/* Echo React state to prove onChange fired (not just a DOM mutation) */}
      <output data-testid="echo">{value}</output>
    </>
  );
}

describe("Field speech: voice dictation", () => {
  it("renders no speech controls when the profile has speech off, even if the field opts in", () => {
    renderWithA11y(<ControlledInput />);
    expect(screen.queryByRole("button", { name: /dictate/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /read .* aloud/i })).toBeNull();
  });

  it("inserts reviewed dictation into a controlled input through onChange", () => {
    const { getPoliteAnnouncement } = renderWithA11y(<ControlledInput />, {
      defaultProfile: DICTATION_PROFILE,
    });

    const input = screen.getByLabelText("Full name") as HTMLInputElement;
    const mic = screen.getByRole("button", { name: "Dictate into Full name" });
    expect(mic.getAttribute("aria-pressed")).toBe("false");
    expect(mic.getAttribute("aria-controls")).toBe("full-name");

    fireEvent.click(mic);
    expect(MockSpeechRecognition.lastInstance?.lang).toBe("en-GB");
    expect(getPoliteAnnouncement()).toContain("Listening. Speak now.");
    const stop = screen.getByRole("button", { name: "Stop dictating" });
    expect(stop.getAttribute("aria-pressed")).toBe("true");

    act(() => MockSpeechRecognition.lastInstance?.simulateResult("Abebe Kebede"));
    // Nothing is written until the user reviews it
    expect(input.value).toBe("");

    fireEvent.click(stop);
    const review = screen.getByRole("group", { name: "Voice input heard" });
    const draft = screen.getByRole("textbox", { name: "Voice input heard" }) as HTMLInputElement;
    expect(review).toBeTruthy();
    expect(draft.value).toBe("Abebe Kebede");
    expect(document.activeElement).toBe(draft);
    expect(getPoliteAnnouncement()).toContain("Voice input heard: Abebe Kebede.");

    expect(document.querySelector('[data-slot="dictation-replace-hint"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    expect(input.value).toBe("Abebe Kebede");
    expect(screen.getByTestId("echo").textContent).toBe("Abebe Kebede");
    expect(screen.queryByRole("group", { name: "Voice input heard" })).toBeNull();
    expect(document.activeElement).toBe(input);
    expect(getPoliteAnnouncement()).toContain("Inserted into Full name.");
  });

  it("replaces existing text only after an explicit, clearly labelled confirmation", () => {
    const { getPoliteAnnouncement } = renderWithA11y(
      <AccessibleInput label="City" defaultValue="Addis" speechInput />,
      { defaultProfile: DICTATION_PROFILE }
    );

    const input = screen.getByLabelText("City") as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Dictate into City" }));
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("Addis"));
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("Ababa"));
    fireEvent.click(screen.getByRole("button", { name: "Stop dictating" }));

    // Button and hint make the overwrite explicit
    expect(screen.queryByRole("button", { name: "Insert" })).toBeNull();
    expect(screen.getByText("This will replace the text already in the field.")).toBeTruthy();
    expect(input.value).toBe("Addis");

    fireEvent.click(screen.getByRole("button", { name: "Replace" }));
    expect(input.value).toBe("Addis Ababa");
    expect(getPoliteAnnouncement()).toContain("Replaced the text in City.");
  });
  it("shows interim text visually without changing the field value", () => {
    renderWithA11y(<ControlledInput />, { defaultProfile: DICTATION_PROFILE });

    const input = screen.getByLabelText("Full name") as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Dictate into Full name" }));
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("Abe", false));

    const status = document.querySelector('[data-slot="dictation-status"]');
    expect(status?.textContent).toContain("Abe");
    expect(status?.getAttribute("aria-hidden")).toBe("true");
    expect(input.value).toBe("");
    expect(screen.getByTestId("echo").textContent).toBe("");
  });

  it("announces a localized failure and shows guidance when recognition errors", () => {
    const { getAssertiveAnnouncement } = renderWithA11y(<ControlledInput />, {
      defaultProfile: DICTATION_PROFILE,
    });

    fireEvent.click(screen.getByRole("button", { name: "Dictate into Full name" }));
    act(() => MockSpeechRecognition.lastInstance?.simulateError("not-allowed"));

    const expected = "Voice input isn't available right now. Please type your answer instead.";
    expect(getAssertiveAnnouncement()).toContain(expected);
    expect(document.querySelector('[data-slot="dictation-status"]')?.textContent).toBe(expected);
  });

  it("never offers dictation for password fields, or when disabled or read-only", () => {
    renderWithA11y(
      <>
        <AccessibleInput label="Password" type="password" speechInput />
        <AccessibleInput label="Locked" disabled speechInput />
        <AccessibleInput label="Fixed" readOnly speechInput />
        <AccessibleInput label="Email" type="email" speechInput />
      </>,
      { defaultProfile: DICTATION_PROFILE }
    );

    expect(screen.queryByRole("button", { name: /dictate into password/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /dictate into locked/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /dictate into fixed/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Dictate into Email" })).toBeTruthy();
  });

  it("requires the developer opt-in: fields without the prop never show buttons", () => {
    renderWithA11y(
      <>
        <AccessibleInput label="Not opted in" />
        <AccessibleInput label="Opted in" speechInput />
      </>,
      { defaultProfile: DICTATION_PROFILE }
    );
    expect(screen.queryByRole("button", { name: /dictate into not opted in/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Dictate into Opted in" })).toBeTruthy();
  });

  it("requires the profile too: the prop alone does not show buttons", () => {
    renderWithA11y(<AccessibleInput label="Search" speechInput speechOutput />);
    expect(screen.queryByRole("button", { name: /dictate into search/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /read search instructions aloud/i })).toBeNull();
  });

  it("shows only the features the field opted in to", () => {
    renderWithA11y(<AccessibleInput label="Notes" speechOutput />, {
      defaultProfile: VOICE_ASSIST_PRESET,
    });
    expect(screen.queryByRole("button", { name: /dictate into notes/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Read Notes instructions aloud" })).toBeTruthy();
  });

  it("the Voice Assistance preset turns both features on for opted-in fields", () => {
    renderWithA11y(<AccessibleTextarea label="Message" speechInput speechOutput />, {
      defaultProfile: VOICE_ASSIST_PRESET,
    });
    expect(screen.getByRole("button", { name: "Dictate into Message" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Read Message instructions aloud" })).toBeTruthy();
  });

  it("respects textarea maxLength and keeps the character counter in sync", () => {
    renderWithA11y(<AccessibleTextarea label="Bio" maxLength={10} speechInput />, {
      defaultProfile: DICTATION_PROFILE,
    });

    const textarea = screen.getByLabelText("Bio") as HTMLTextAreaElement;
    fireEvent.click(screen.getByRole("button", { name: "Dictate into Bio" }));
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("I build accessible apps"));
    fireEvent.click(screen.getByRole("button", { name: "Stop dictating" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert" }));

    expect(textarea.value).toBe("I build ac");
    expect(screen.getByText("10 / 10 characters")).toBeTruthy();
  });

  it("does not remount the field when a profile switch turns speech on", () => {
    const runtime = createAccessibilityRuntime({ defaultProfile: DEFAULT_PROFILE, persistence: "none" });
    renderWithA11y(<AccessibleInput label="Notes" defaultValue="typed by hand" speechInput />, { runtime });

    const before = screen.getByLabelText("Notes") as HTMLInputElement;
    act(() => runtime.updatePreferences({ speech: { speechInput: true } }));

    const after = screen.getByLabelText("Notes") as HTMLInputElement;
    expect(after).toBe(before);
    expect(after.value).toBe("typed by hand");
    expect(screen.getByRole("button", { name: "Dictate into Notes" })).toBeTruthy();
  });

  it("forwards the ref to the input element when speech is enabled", () => {
    const ref = React.createRef<HTMLInputElement>();
    renderWithA11y(<AccessibleInput ref={ref} label="Ref field" speechInput />, {
      defaultProfile: DICTATION_PROFILE,
    });
    expect(ref.current).toBe(screen.getByLabelText("Ref field"));
  });
});

/** Sends a final result whose segment carries several alternative readings. */
function sendAlternatives(alternatives: string[]) {
  const segment = Object.assign(
    alternatives.map((transcript) => ({ transcript, confidence: 0.5 })),
    { isFinal: true }
  );
  act(() => MockSpeechRecognition.lastInstance?.onresult?.({ resultIndex: 0, results: [segment] }));
}

describe("Field speech: review before insert", () => {
  const renderField = () => {
    const utils = renderWithA11y(<ControlledInput />, { defaultProfile: DICTATION_PROFILE });
    fireEvent.click(screen.getByRole("button", { name: "Dictate into Full name" }));
    return utils;
  };
  const stop = () => fireEvent.click(screen.getByRole("button", { name: "Stop dictating" }));
  const draft = () => screen.getByRole("textbox", { name: "Voice input heard" }) as HTMLInputElement;
  const fieldValue = () => (screen.getByLabelText("Full name") as HTMLInputElement).value;

  it("asks the engine for up to 5 alternative matches", () => {
    renderField();
    expect((MockSpeechRecognition.lastInstance as unknown as { maxAlternatives: number }).maxAlternatives).toBe(5);
  });

  it("lets the user pick another match the engine heard", () => {
    renderField();
    sendAlternatives(["a baby bikila", "Abebe Bikila", "Abebe Bekila"]);
    stop();

    const choices = screen.getAllByRole("button", { pressed: false }).filter((b) =>
      ["Abebe Bikila", "Abebe Bekila"].includes(b.textContent ?? "")
    );
    expect(choices).toHaveLength(2);
    expect(screen.getByRole("button", { name: "a baby bikila" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Abebe Bikila" }));
    expect(draft().value).toBe("Abebe Bikila");
    expect(screen.getByRole("button", { name: "Abebe Bikila" }).getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(draft());

    fireEvent.keyDown(draft(), { key: "Enter" });
    expect(fieldValue()).toBe("Abebe Bikila");
  });

  it("inserts the user's own correction when they edit the heard text", () => {
    renderField();
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("a baby bikila"));
    stop();

    fireEvent.change(draft(), { target: { value: "Abebe Bikila" } });
    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    expect(fieldValue()).toBe("Abebe Bikila");
  });

  it("hides the alternatives list when there is only one match", () => {
    renderField();
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("hello"));
    stop();
    expect(screen.queryByText("Or choose another match:")).toBeNull();
  });

  it("discards with Escape, keeps the field unchanged and returns focus to the mic", () => {
    const { getPoliteAnnouncement } = renderField();
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("wrong words"));
    stop();

    fireEvent.keyDown(draft(), { key: "Escape" });
    expect(screen.queryByRole("group", { name: "Voice input heard" })).toBeNull();
    expect(fieldValue()).toBe("");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Dictate into Full name" }));
    expect(getPoliteAnnouncement()).toContain("Voice input discarded.");
  });

  it("disables Insert when the draft is cleared", () => {
    renderField();
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("something"));
    stop();
    fireEvent.change(draft(), { target: { value: "  " } });
    expect((screen.getByRole("button", { name: "Insert" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Try again starts a fresh session and keeps focus on the mic", () => {
    renderField();
    const first = MockSpeechRecognition.lastInstance;
    act(() => first?.simulateResult("first attempt"));
    stop();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(MockSpeechRecognition.lastInstance).not.toBe(first);
    expect(screen.queryByRole("group", { name: "Voice input heard" })).toBeNull();
    const mic = screen.getByRole("button", { name: "Stop dictating" });
    expect(document.activeElement).toBe(mic);

    act(() => MockSpeechRecognition.lastInstance?.simulateResult("second attempt"));
    stop();
    expect(draft().value).toBe("second attempt");
    expect(fieldValue()).toBe("");
  });

  it("does not open a review when nothing was heard", () => {
    const { getPoliteAnnouncement } = renderField();
    stop();
    expect(screen.queryByRole("group", { name: "Voice input heard" })).toBeNull();
    expect(getPoliteAnnouncement()).toContain("Voice input stopped.");
  });

  it("opens the review for a final result that arrives just after stopping", () => {
    renderField();
    const instance = MockSpeechRecognition.lastInstance;
    stop();
    expect(screen.queryByRole("group", { name: "Voice input heard" })).toBeNull();
    act(() => instance?.simulateResult("late result"));
    expect(draft().value).toBe("late result");
  });

  it("Escape in the review does not close a surrounding dialog", () => {
    const onOpenChange = vi.fn();
    renderWithA11y(
      <AccessibleDialog open onOpenChange={onOpenChange} title="Edit profile">
        <AccessibleInput label="Nickname" speechInput />
      </AccessibleDialog>,
      { defaultProfile: DICTATION_PROFILE }
    );
    fireEvent.click(screen.getByRole("button", { name: "Dictate into Nickname" }));
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("Abe"));
    fireEvent.click(screen.getByRole("button", { name: "Stop dictating" }));

    fireEvent.keyDown(draft(), { key: "Escape" });
    expect(screen.queryByRole("group", { name: "Voice input heard" })).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Edit profile" })).toBeTruthy();
  });

  it("localizes the review in Amharic", () => {
    renderWithA11y(<AccessibleInput label="ስም" speechInput />, {
      defaultProfile: withSpeech({ speechInput: true }, AMHARIC_PRESET),
    });
    fireEvent.click(screen.getByRole("button", { name: "ወደ ስም በድምፅ አስገባ" }));
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("አበበ ቢቂላ"));
    fireEvent.click(screen.getByRole("button", { name: "በድምፅ መጻፍ አቁም" }));

    expect(screen.getByRole("group", { name: "የድምፅ ግቤት የሰማው" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "አስገባ" }));
    expect((screen.getByLabelText("ስም") as HTMLInputElement).value).toBe("አበበ ቢቂላ");
  });
});

describe("Field speech: email and phone fields", () => {
  const draft = () => screen.getByRole("textbox", { name: "Voice input heard" }) as HTMLInputElement;
  const dictate = (label: string) =>
    fireEvent.click(screen.getByRole("button", { name: `Dictate into ${label}` }));
  const stop = () => fireEvent.click(screen.getByRole("button", { name: "Stop dictating" }));

  it("converts spoken symbols and moves invalid addresses below valid ones", () => {
    renderWithA11y(<AccessibleInput label="Email" type="email" speechInput />, {
      defaultProfile: DICTATION_PROFILE,
    });
    dictate("Email");
    // Engine's best guess is not a valid address; it must drop below valid ones,
    // which keep the engine's own order.
    sendAlternatives(["hey look gmail.com", "henok at gmail dot com", "hey look at gmail.com"]);
    stop();

    expect(draft().value).toBe("henok@gmail.com");
    const options = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("data-slot") === "dictation-alternative")
      .map((b) => b.textContent);
    expect(options).toEqual(["henok@gmail.com", "heylook@gmail.com", "heylookgmail.com"]);

    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("henok@gmail.com");
  });

  it("joins letters spelled one at a time", () => {
    renderWithA11y(<AccessibleInput label="Email" type="email" speechInput />, {
      defaultProfile: DICTATION_PROFILE,
    });
    dictate("Email");
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("h e n o k at gmail dot com"));
    stop();
    expect(draft().value).toBe("henok@gmail.com");
  });

  it("replaces a partially typed address with the reviewed one", () => {
    renderWithA11y(<AccessibleInput label="Email" type="email" defaultValue="henok" speechInput />, {
      defaultProfile: DICTATION_PROFILE,
    });
    dictate("Email");
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("henok at gmail dot com"));
    stop();
    fireEvent.click(screen.getByRole("button", { name: "Replace" }));
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("henok@gmail.com");
  });
  it("gives email-specific guidance when listening and in the review", () => {
    const { getPoliteAnnouncement } = renderWithA11y(
      <AccessibleInput label="Email" type="email" speechInput />,
      { defaultProfile: DICTATION_PROFILE }
    );
    dictate("Email");
    expect(getPoliteAnnouncement()).toContain("Say the email address.");
    expect(document.querySelector('[data-slot="dictation-status"]')?.textContent).toContain(
      "Spell unusual names letter by letter"
    );
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("henok at gmail dot com"));
    stop();
    expect(screen.getByRole("group", { name: "Voice input heard" }).textContent).toContain(
      "Tip: say “at” for @"
    );
  });

  it("converts spoken digits for phone fields", () => {
    const { getPoliteAnnouncement } = renderWithA11y(
      <AccessibleInput label="Phone" type="tel" speechInput />,
      { defaultProfile: DICTATION_PROFILE }
    );
    dictate("Phone");
    expect(getPoliteAnnouncement()).toContain("one digit at a time");
    act(() =>
      MockSpeechRecognition.lastInstance?.simulateResult(
        "plus two five one nine one one double two three four five six"
      )
    );
    stop();
    expect(draft().value).toBe("+251911223456");
  });

  it("keeps prose words (no symbol conversion) and shows the spelling tip", () => {
    renderWithA11y(<AccessibleTextarea label="Note" speechInput />, {
      defaultProfile: DICTATION_PROFILE,
    });
    dictate("Note");
    expect(document.querySelector('[data-slot="dictation-status"]')?.textContent).toContain(
      "spell unusual names letter by letter"
    );
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("meet me at five dot thirty"));
    stop();
    expect(draft().value).toBe("meet me at five dot thirty");
    const review = screen.getByRole("group", { name: "Voice input heard" }).textContent ?? "";
    expect(review).toContain("Tip: spell unusual names letter by letter");
    expect(review).not.toContain("“at” for @");
  });

  it("joins letters spelled one at a time in name and prose fields", () => {
    renderWithA11y(
      <>
        <AccessibleInput label="Full name" speechInput />
        <AccessibleTextarea label="About" speechInput />
      </>,
      { defaultProfile: DICTATION_PROFILE }
    );

    dictate("Full name");
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("Abebe B I K I L A"));
    stop();
    expect(draft().value).toBe("Abebe Bikila");
    fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe("Abebe Bikila");

    dictate("About");
    act(() => MockSpeechRecognition.lastInstance?.simulateResult("my name is h e n o k and I am a runner"));
    stop();
    expect(draft().value).toBe("my name is henok and I am a runner");
  });
});

describe("Field speech: read aloud", () => {
  it("reads label, required state, instructions and error with the profile language and rate", async () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, "speak");
    renderWithA11y(
      <AccessibleInput
        label="Phone number"
        speechOutput
        required
        description="Include the area code."
        error="Your phone number appears incomplete."
      />,
      { defaultProfile: READ_ALOUD_PROFILE }
    );

    const speaker = screen.getByRole("button", { name: "Read Phone number instructions aloud" });
    expect(speaker.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(speaker);

    const utterance = speakSpy.mock.calls[0][0] as unknown as {
      text: string;
      lang: string;
      rate: number;
    };
    expect(utterance.text).toBe(
      "Phone number. Required. Include the area code. Error: Your phone number appears incomplete."
    );
    expect(utterance.lang).toBe("en-GB");
    expect(utterance.rate).toBe(0.8);

    const stop = screen.getByRole("button", { name: "Stop reading" });
    expect(stop.getAttribute("aria-pressed")).toBe("true");
    const cancelSpy = vi.spyOn(window.speechSynthesis, "cancel");
    fireEvent.click(stop);
    expect(cancelSpy).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /read phone number instructions aloud/i })).toBeTruthy()
    );

    speakSpy.mockRestore();
    cancelSpy.mockRestore();
  });

  it("reads the simplified description when simplified language is active", () => {
    const speakSpy = vi.spyOn(window.speechSynthesis, "speak");
    renderWithA11y(
      <AccessibleTextarea
        label="Reason"
        speechOutput
        description="Provide a detailed justification for the request."
        simplifiedDescription="Say why you need this."
      />,
      {
        defaultProfile: {
          ...READ_ALOUD_PROFILE,
          cognitive: { simplifiedLanguage: true },
        },
      }
    );

    fireEvent.click(screen.getByRole("button", { name: "Read Reason instructions aloud" }));
    const utterance = speakSpy.mock.calls[0][0] as unknown as { text: string };
    expect(utterance.text).toBe("Reason. Say why you need this.");
    speakSpy.mockRestore();
  });

  it("is still available on disabled fields (reading is not editing)", () => {
    renderWithA11y(<AccessibleInput label="Account ID" disabled speechOutput />, {
      defaultProfile: READ_ALOUD_PROFILE,
    });
    expect(screen.getByRole("button", { name: "Read Account ID instructions aloud" })).toBeTruthy();
  });
});

describe("Field speech: localization", () => {
  it("localizes control names and uses the Amharic speech language", () => {
    renderWithA11y(<AccessibleInput label="ስም" speechInput speechOutput />, {
      defaultProfile: withSpeech({ speechInput: true, speechOutput: true }, AMHARIC_PRESET),
    });

    const mic = screen.getByRole("button", { name: "ወደ ስም በድምፅ አስገባ" });
    expect(screen.getByRole("button", { name: "የስም መመሪያዎችን በድምፅ አንብብ" })).toBeTruthy();

    fireEvent.click(mic);
    expect(MockSpeechRecognition.lastInstance?.lang).toBe("am-ET");
  });
});
