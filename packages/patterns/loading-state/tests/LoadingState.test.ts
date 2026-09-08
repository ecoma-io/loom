import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import LoadingState from "../src/LoadingState.vue";
import Spinner from "@ecoma-io/loom-spinner";
import Skeleton from "@ecoma-io/loom-skeleton";

// Unit tier: every project-internal collaborator is isolated. Each stub keeps
// only the seam this file's own behaviour is defined against — Spinner renders
// in spinner mode, Skeleton renders in skeleton mode. The imports above resolve
// to these same mocks (Vitest intercepts every import of the path, this file's
// included), which is what lets `findComponent` below match by reference.
vi.mock("@ecoma-io/loom-spinner", async () => {
  const actual = await vi.importActual("@ecoma-io/loom-spinner");
  const c = (actual as { default: { emits?: string[]; props?: Record<string, unknown> } }).default;
  return {
    default: {
      name: "Spinner",
      props: c.props ? Object.keys(c.props) : [],
      emits: c.emits ?? [],
      template: '<div data-testid="spinner" />',
    },
  };
});
vi.mock("@ecoma-io/loom-skeleton", async () => {
  const actual = await vi.importActual("@ecoma-io/loom-skeleton");
  const c = (actual as { default: { emits?: string[]; props?: Record<string, unknown> } }).default;
  return {
    default: {
      name: "Skeleton",
      props: c.props ? Object.keys(c.props) : [],
      emits: c.emits ?? [],
      template: '<div data-testid="skeleton" />',
    },
  };
});

describe("LoadingState", () => {
  it("defaults to spinner mode when no mode is given", () => {
    const wrapper = mount(LoadingState);

    expect(wrapper.findComponent(Spinner).exists()).toBe(true);
    expect(wrapper.findComponent(Skeleton).exists()).toBe(false);
  });

  it("renders a Spinner in spinner mode", () => {
    const wrapper = mount(LoadingState, { props: { mode: "spinner" } });

    expect(wrapper.findComponent(Spinner).exists()).toBe(true);
    expect(wrapper.findComponent(Skeleton).exists()).toBe(false);
  });

  it("passes size=lg to the Spinner — short waits deserve a larger glyph than the default md", () => {
    const wrapper = mount(LoadingState, { props: { mode: "spinner" } });

    expect(wrapper.findComponent(Spinner).props("size")).toBe("lg");
  });

  it("renders the label below the spinner when provided", () => {
    const wrapper = mount(LoadingState, { props: { mode: "spinner", label: "Loading…" } });

    expect(wrapper.text()).toContain("Loading…");
  });

  it("omits the label element when no label is given, so the block never reserves space for invisible text", () => {
    const wrapper = mount(LoadingState, { props: { mode: "spinner" } });

    expect(wrapper.find("p").exists()).toBe(false);
  });

  it("renders skeleton lines in skeleton mode", () => {
    const wrapper = mount(LoadingState, { props: { mode: "skeleton" } });

    // Three default skeleton lines of varying widths.
    expect(wrapper.findAllComponents(Skeleton)).toHaveLength(3);
    expect(wrapper.findComponent(Spinner).exists()).toBe(false);
  });

  it("renders slot content in skeleton mode instead of the default lines, so hosts that know their own shape can match it", () => {
    const wrapper = mount(LoadingState, {
      props: { mode: "skeleton" },
      slots: { default: '<div data-testid="custom-skeleton" />' },
    });

    expect(wrapper.find("[data-testid='custom-skeleton']").exists()).toBe(true);
    // Default skeleton lines are replaced, not supplemented.
    expect(wrapper.findAllComponents(Skeleton)).toHaveLength(0);
  });
});
