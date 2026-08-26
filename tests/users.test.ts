import { describe, expect, it } from "vitest";
import { registerUser, EmailAlreadyInUseError } from "@/lib/users";
import { verifyPassword } from "@/lib/password";

describe("registro de usuário", () => {
  it("faz hash da senha e nunca guarda em texto puro", async () => {
    const user = await registerUser({
      name: "Vitor",
      email: "vitor@example.com",
      password: "senha1234",
    });

    expect(user.passwordHash).not.toBe("senha1234");
    expect(user.passwordHash).not.toBeNull();
    const passwordHash = user.passwordHash!;
    expect(await verifyPassword("senha1234", passwordHash)).toBe(true);
    expect(await verifyPassword("senha-errada", passwordHash)).toBe(false);
  });

  it("normaliza o e-mail para minúsculas", async () => {
    const user = await registerUser({
      name: "Vitor",
      email: "Vitor@Example.com",
      password: "senha1234",
    });

    expect(user.email).toBe("vitor@example.com");
  });

  it("rejeita e-mail já cadastrado", async () => {
    await registerUser({
      name: "Vitor",
      email: "vitor@example.com",
      password: "senha1234",
    });

    await expect(
      registerUser({
        name: "Outro Vitor",
        email: "vitor@example.com",
        password: "outrasenha",
      }),
    ).rejects.toThrow(EmailAlreadyInUseError);
  });
});
