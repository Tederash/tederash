import { describe, expect, it, vi } from "vitest";
import { COGNITIVE_ASSIST_PRESET, DEFAULT_PROFILE, LOW_VISION_PRESET, MOTOR_ASSIST_PRESET, createAccessibilityRuntime, resolveAdaptations, resolveProfile, validateProfile, } from "../src";
describe("Accessibility Profile & Validation", () => {
    it("validates the default profile successfully", () => {
        const result = validateProfile(DEFAULT_PROFILE);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });
    it("validates all built-in presets successfully", () => {
        expect(validateProfile(LOW_VISION_PRESET).valid).toBe(true);
        expect(validateProfile(MOTOR_ASSIST_PRESET).valid).toBe(true);
        expect(validateProfile(COGNITIVE_ASSIST_PRESET).valid).toBe(true);
    });
    it("detects invalid profile fields", () => {
        const invalid = {
            id: "",
            name: "",
            visual: {
                fontScale: 5.0, // out of range 0.5 - 3.0
                colorScheme: "neon", // invalid scheme
            },
            motor: {
                targetSize: "huge", // invalid target size
            },
        };
        const result = validateProfile(invalid);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });
});
describe("Profile Resolution & Precedence", () => {
    it("resolves hierarchy: Component override > Active profile > App default > Framework default", () => {
        const frameworkDefault = DEFAULT_PROFILE;
        const appDefaults = { visual: { fontScale: 1.1 } };
        const activeProfile = { visual: { fontScale: 1.3, highContrast: true } };
        const componentOverride = { visual: { fontScale: 1.5 } };
        const resolved = resolveProfile(frameworkDefault, appDefaults, activeProfile, componentOverride);
        // Component override wins for fontScale
        expect(resolved.visual?.fontScale).toBe(1.5);
        // Active profile wins for highContrast
        expect(resolved.visual?.highContrast).toBe(true);
        // Framework default is preserved for unmentioned values
        expect(resolved.motor?.targetSize).toBe("normal");
    });
});
describe("Adaptation Engine", () => {
    it("resolves standard profile to baseline adaptations", () => {
        const adaptations = resolveAdaptations(DEFAULT_PROFILE);
        expect(adaptations.fontScale).toBe(1.0);
        expect(adaptations.targetSize).toBe("normal");
        expect(adaptations.minTargetHeight).toBe("40px");
        expect(adaptations.highContrast).toBe(false);
        expect(adaptations.focusIndicator).toBe("standard");
        expect(adaptations.cssVariables["--a11y-font-scale"]).toBe("1");
        expect(adaptations.dataAttributes["data-a11y-target-size"]).toBe("normal");
    });
    it("resolves low vision preset adaptations correctly", () => {
        const adaptations = resolveAdaptations(LOW_VISION_PRESET);
        expect(adaptations.fontScale).toBe(1.35);
        expect(adaptations.highContrast).toBe(true);
        expect(adaptations.underlineLinks).toBe(true);
        expect(adaptations.focusIndicator).toBe("high-visibility");
        expect(adaptations.minTargetHeight).toBe("48px");
        expect(adaptations.dataAttributes["data-a11y-high-contrast"]).toBe("true");
        expect(adaptations.dataAttributes["data-a11y-underline-links"]).toBe("true");
    });
    it("resolves motor assist preset to extra-large touch targets", () => {
        const adaptations = resolveAdaptations(MOTOR_ASSIST_PRESET);
        expect(adaptations.targetSize).toBe("extra-large");
        expect(adaptations.minTargetHeight).toBe("56px");
        expect(adaptations.focusIndicator).toBe("high-visibility");
        expect(adaptations.dataAttributes["data-a11y-target-size"]).toBe("extra-large");
    });
});
describe("Accessibility Runtime (Framework-Independent)", () => {
    it("initializes with default profile and notifies subscribers on update", () => {
        const runtime = createAccessibilityRuntime({
            persistence: "memory",
        });
        expect(runtime.getProfile().id).toBe("standard");
        expect(runtime.getAdaptations().fontScale).toBe(1.0);
        const listener = vi.fn();
        const unsubscribe = runtime.subscribe(listener);
        runtime.setProfile(LOW_VISION_PRESET);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(runtime.getProfile().id).toBe("low-vision");
        expect(runtime.getAdaptations().fontScale).toBe(1.35);
        expect(runtime.getAdaptations().highContrast).toBe(true);
        unsubscribe();
        runtime.setProfile(DEFAULT_PROFILE);
        expect(listener).toHaveBeenCalledTimes(1); // not called after unsubscribe
    });
    it("updates individual preferences without changing full profile identity", () => {
        const runtime = createAccessibilityRuntime({
            persistence: "memory",
        });
        runtime.updatePreferences({
            visual: {
                fontScale: 1.6,
            },
            motor: {
                targetSize: "extra-large",
            },
        });
        expect(runtime.getProfile().visual?.fontScale).toBe(1.6);
        expect(runtime.getProfile().motor?.targetSize).toBe("extra-large");
        expect(runtime.getAdaptations().minTargetHeight).toBe("56px");
    });
    it("resets profile back to defaults", () => {
        const runtime = createAccessibilityRuntime({
            persistence: "memory",
        });
        runtime.setProfile(MOTOR_ASSIST_PRESET);
        expect(runtime.getProfile().id).toBe("motor-assist");
        runtime.resetProfile();
        expect(runtime.getProfile().id).toBe("standard");
        expect(runtime.getAdaptations().targetSize).toBe("normal");
    });
    it("dispatches live announcements with deduplication", () => {
        const runtime = createAccessibilityRuntime({ persistence: "none" });
        const listener = vi.fn();
        runtime.onAnnounce(listener);
        const a1 = runtime.announce({
            message: "Form saved successfully",
            priority: "polite",
            deduplicate: true,
        });
        expect(listener).toHaveBeenCalledTimes(1);
        expect(a1.message).toBe("Form saved successfully");
        expect(a1.priority).toBe("polite");
        // Immediate duplicate should be ignored
        runtime.announce({
            message: "Form saved successfully",
            priority: "polite",
            deduplicate: true,
        });
        expect(listener).toHaveBeenCalledTimes(1);
        // Different message should dispatch
        runtime.announce({
            message: "New message received",
            priority: "assertive",
        });
        expect(listener).toHaveBeenCalledTimes(2);
    });
});
//# sourceMappingURL=runtime.test.js.map