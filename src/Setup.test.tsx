import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import * as lib from "./lib";
vi.mock("./lib", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib")>()),
  configured: false,
  readTotal: vi.fn(),
}));
afterEach(cleanup);
it("explains missing configuration without querying a contract", () => {
  location.hash = "#/";
  render(<App />);
  expect(
    screen.getByRole("heading", { name: /Um espaço em branco/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Atualizar mural" }),
  ).toBeDisabled();
  expect(lib.readTotal).not.toHaveBeenCalled();
});
it("explains permanence and opens an accessible project dialog", () => {
  location.hash = "#/publicar";
  render(<App />);
  expect(
    screen.getByText(/O contrato ainda não foi configurado/),
  ).toBeInTheDocument();
  expect(screen.getByText("público e permanente")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sobre o projeto" }));
  expect(
    screen.getByRole("dialog", { name: "Um mural, muitas vozes." }),
  ).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
