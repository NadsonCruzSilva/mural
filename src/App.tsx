import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  CircleHelp,
  Copy,
  ExternalLink,
  Globe2,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  MessageSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import {
  characterCount,
  chainId,
  configured,
  connectWallet,
  deployment,
  metamask,
  networkName,
  publish,
  readPage,
  readTotal,
  readableError,
  rpc,
  shortAddress,
  switchNetwork,
  txUrl,
  validMessage,
  type Message,
} from "./lib";

function useWallet() {
  const [account, setAccount] = useState("");
  const [network, setNetwork] = useState<number>();
  useEffect(() => {
    const provider = metamask();
    if (!provider) return;
    let active = true;
    const accounts = (values: string[]) => {
      if (active) setAccount(values[0] ?? "");
    };
    const chains = (value: string) => {
      if (active) setNetwork(Number(value));
    };
    const disconnect = () => {
      if (active) {
        setAccount("");
        setNetwork(undefined);
      }
    };
    provider.on?.("accountsChanged", accounts);
    provider.on?.("chainChanged", chains);
    provider.on?.("disconnect", disconnect);
    void Promise.all([
      provider.request({ method: "eth_accounts" }),
      provider.request({ method: "eth_chainId" }),
    ])
      .then(([a, c]) => {
        accounts(a as string[]);
        chains(c as string);
      })
      .catch(disconnect);
    return () => {
      active = false;
      provider.removeListener?.("accountsChanged", accounts);
      provider.removeListener?.("chainChanged", chains);
      provider.removeListener?.("disconnect", disconnect);
    };
  }, []);
  async function connect() {
    const provider = metamask();
    if (!provider) throw new Error("METAMASK_MISSING");
    const accounts = await connectWallet(provider);
    setAccount(accounts[0] ?? "");
    setNetwork(Number(await provider.request({ method: "eth_chainId" })));
  }
  async function changeNetwork() {
    const provider = metamask();
    if (!provider) return;
    await switchNetwork(provider);
    setNetwork(Number(await provider.request({ method: "eth_chainId" })));
  }
  return { account, network, connect, changeNetwork };
}

export default function App() {
  const [screen, setScreen] = useState(
    location.hash === "#/publicar" ? "publish" : "wall",
  );
  const wallet = useWallet();
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState<number>();
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [hashWarning, setHashWarning] = useState(false);
  const [offset, setOffset] = useState(0);
  const [snapshot, setSnapshot] = useState(0);
  const requestId = useRef(0);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<
    "idle" | "signing" | "pending" | "success"
  >("idle");
  const [transaction, setTransaction] = useState("");
  const [publishError, setPublishError] = useState("");
  const [help, setHelp] = useState(false);
  const [copied, setCopied] = useState("");
  const busy = status === "signing" || status === "pending";
  useEffect(() => {
    const listener = () =>
      setScreen(location.hash === "#/publicar" ? "publish" : "wall");
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  async function load(reset = true) {
    if (!configured) return;
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const block = reset ? await rpc.getBlockNumber() : snapshot;
      const count = reset ? await readTotal(block) : total!;
      const end = reset ? count : offset;
      const start = Math.max(0, end - 20);
      const page =
        end > 0
          ? await readPage(start, end - start, block)
          : { messages: [], missingHashes: false };
      if (id !== requestId.current) return;
      setTotal(count);
      setSnapshot(block);
      setOffset(start);
      setMessages((old) =>
        reset ? page.messages : [...old, ...page.messages],
      );
      setHashWarning((old) =>
        reset ? page.missingHashes : old || page.missingHashes,
      );
    } catch (e) {
      if (id === requestId.current) setError(readableError(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      requestId.current++;
    };
  }, [configured, deployment?.address, chainId]);
  async function handleWallet() {
    setWalletBusy(true);
    setWalletError("");
    try {
      if (wallet.account && wallet.network !== chainId)
        await wallet.changeNetwork();
      else await wallet.connect();
    } catch (e) {
      setWalletError(
        (e as Error).message === "METAMASK_MISSING"
          ? "Instale a extensão MetaMask no navegador para conectar sua carteira."
          : readableError(e),
      );
    } finally {
      setWalletBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!configured || !validMessage(content) || busy) return;
    const provider = metamask();
    if (!provider || !wallet.account || wallet.network !== chainId) return;
    setPublishError("");
    setTransaction("");
    setStatus("signing");
    try {
      const hash = await publish(provider, content, (hash) => {
        setTransaction(hash);
        setStatus("pending");
      });
      setTransaction(hash);
      setStatus("success");
      setContent("");
      void load();
    } catch (e) {
      setPublishError(readableError(e));
      setStatus("idle");
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setWalletError(
        "Não foi possível copiar. Selecione o endereço para copiá-lo.",
      );
    }
  }
  const walletLabel = walletBusy
    ? "Conectando…"
    : wallet.account
      ? wallet.network === chainId
        ? shortAddress(wallet.account)
        : "Trocar de rede"
      : "Conectar carteira";
  const count = characterCount(content);

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-inner">
          <a className="brand" href="#/" aria-label="Mural, início">
            <span className="brand-mark">
              <MessageSquare size={21} strokeWidth={2.5} />
            </span>
            mural<span className="brand-dot">.</span>
          </a>
          <nav aria-label="Navegação principal">
            <a className={screen === "wall" ? "active" : ""} href="#/">
              <Layers3 size={16} />O mural
            </a>
            <a
              className={screen === "publish" ? "active" : ""}
              href="#/publicar"
            >
              <Plus size={16} />
              Publicar recado
            </a>
          </nav>
          <div className="header-actions">
            <span className="network-badge">
              <span className="green-dot" />
              {chainId === 31337 ? "Local" : "Sepolia"}
            </span>
            <button
              className="button wallet-button"
              onClick={handleWallet}
              disabled={walletBusy}
            >
              <Wallet size={16} />
              {walletLabel}
            </button>
          </div>
        </div>
      </header>
      {walletError && (
        <div className="global-alert" role="alert">
          {walletError}
          <button aria-label="Fechar aviso" onClick={() => setWalletError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <main>
        {screen === "wall" ? (
          <>
            <section className="hero">
              <div className="eyebrow">
                <span className="mini-line" />
                UM ESPAÇO DE TODOS. PARA SEMPRE.
              </div>
              <h1>
                Pequenas mensagens.
                <br />
                <span>Registros permanentes.</span>
              </h1>
              <p>
                Uma ideia, um olá, um pensamento. Deixe sua marca em um mural
                <br className="desktop-break" /> público, aberto e registrado na
                blockchain Ethereum.
              </p>
              <div className="hero-actions">
                <a className="button primary" href="#/publicar">
                  <Plus size={18} />
                  Escrever um recado
                  <ArrowUpRight size={16} />
                </a>
                <button className="text-button" onClick={() => setHelp(true)}>
                  Como funciona
                  <CircleHelp size={15} />
                </button>
              </div>
              <div className="hero-orbit" aria-hidden="true">
                <div className="orbit orbit-a" />
                <div className="orbit orbit-b" />
                <div className="floating-note note-one">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="floating-note note-two">
                  <MessageSquare size={34} />
                  <div />
                  <div />
                </div>
                <div className="orbit-spark">
                  <Sparkles size={20} />
                </div>
                <div className="orbit-dot" />
              </div>
            </section>
            <section className="trust-strip" aria-label="Sobre o mural">
              <div>
                <span className="feature-icon">
                  <Globe2 size={18} />
                </span>
                <span>
                  <strong>Aberto a todos</strong>
                  <small>Leia livremente. Publique com sua carteira.</small>
                </span>
              </div>
              <div>
                <span className="feature-icon">
                  <LockKeyhole size={18} />
                </span>
                <span>
                  <strong>Feito para permanecer</strong>
                  <small>Sem edições. Sem exclusões.</small>
                </span>
              </div>
              <div>
                <span className="feature-icon">
                  <ShieldCheck size={18} />
                </span>
                <span>
                  <strong>Verificável na blockchain</strong>
                  <small>Cada recado tem seu próprio registro.</small>
                </span>
              </div>
            </section>
            <section className="wall-section" aria-labelledby="wall-title">
              <div className="section-heading">
                <div className="section-title">
                  <h2 id="wall-title">O que fica no mural</h2>
                  <span className="count-badge">
                    {total === undefined ? "—" : total} recados
                  </span>
                </div>
                <div className="wall-tools">
                  <span>Mais recentes primeiro</span>
                  <button
                    className="icon-button"
                    title="Atualizar mural"
                    aria-label="Atualizar mural"
                    disabled={loading || !configured}
                    onClick={() => void load()}
                  >
                    <RefreshCw size={16} className={loading ? "spin" : ""} />
                  </button>
                </div>
              </div>
              {!configured ? (
                <Setup onHelp={() => setHelp(true)} />
              ) : (
                <>
                  {error && (
                    <div className="notice error" role="alert">
                      {error}
                      <button
                        className="text-button"
                        onClick={() => void load()}
                      >
                        Tentar novamente
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  )}
                  {hashWarning && (
                    <div className="notice">
                      Os recados foram carregados, mas o RPC não retornou todos
                      os links de transação. Atualize para tentar novamente.
                    </div>
                  )}
                  {loading && messages.length === 0 ? (
                    <div
                      className="message-grid"
                      aria-label="Carregando recados"
                      aria-busy="true"
                    >
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div className="message-card skeleton" key={i}>
                          <span />
                          <span />
                          <span />
                        </div>
                      ))}
                    </div>
                  ) : messages.length ? (
                    <div className="message-grid">
                      {messages.map((message) => (
                        <article className="message-card" key={message.id}>
                          <div className="card-top">
                            <span className="message-index">
                              RECADO #{message.id.padStart(3, "0")}
                            </span>
                            <span className="verified">
                              <CheckCheck size={14} />
                              Registrado
                            </span>
                          </div>
                          <p className="message-content">{message.content}</p>
                          <div className="card-bottom">
                            <div className="author-row">
                              <span
                                className="avatar"
                                style={{
                                  backgroundColor: `hsl(${parseInt(message.author.slice(2, 6), 16) % 360} 65% 94%)`,
                                }}
                              >
                                <span
                                  style={{
                                    backgroundColor: `hsl(${parseInt(message.author.slice(2, 6), 16) % 360} 50% 55%)`,
                                  }}
                                />
                              </span>
                              <button
                                className="address-button"
                                onClick={() => void copy(message.author)}
                                title={message.author}
                              >
                                {shortAddress(message.author)}
                                {copied === message.author ? (
                                  <Check size={12} />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                            <div className="card-meta">
                              <time
                                dateTime={new Date(
                                  message.timestamp * 1000,
                                ).toISOString()}
                              >
                                {new Date(
                                  message.timestamp * 1000,
                                ).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </time>
                              {message.hash && txUrl(message.hash) ? (
                                <a
                                  href={txUrl(message.hash)}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Ver transação do recado ${message.id}`}
                                  title="Ver transação no Etherscan"
                                >
                                  <ArrowUpRight size={16} />
                                </a>
                              ) : message.hash ? (
                                <button
                                  className="icon-button"
                                  onClick={() => void copy(message.hash!)}
                                  title="Copiar hash da transação"
                                >
                                  <Copy size={14} />
                                </button>
                              ) : (
                                <span title="Transação indisponível no RPC">
                                  —
                                </span>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    !error && (
                      <div className="empty-state">
                        <span className="empty-icon">
                          <MessageSquare size={28} />
                        </span>
                        <h3>Toda conversa começa com um olá.</h3>
                        <p>
                          Este mural ainda está em branco. Que tal deixar o
                          primeiro recado?
                        </p>
                        <a className="button primary" href="#/publicar">
                          Publicar primeiro recado
                          <ArrowRight size={16} />
                        </a>
                      </div>
                    )
                  )}
                  {offset > 0 && (
                    <div className="load-more">
                      <button
                        className="button secondary"
                        disabled={loading}
                        onClick={() => void load(false)}
                      >
                        {loading ? (
                          <LoaderCircle size={16} className="spin" />
                        ) : (
                          <ArrowDown size={16} />
                        )}
                        Carregar mais recados
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
            <section className="bottom-callout">
              <span className="callout-icon">
                <Sparkles size={22} />
              </span>
              <div>
                <h3>Sua próxima ideia merece um lugar aqui.</h3>
                <p>Até 280 caracteres. Uma pequena marca que permanece.</p>
              </div>
              <a href="#/publicar" className="text-button">
                Deixar meu recado
                <ArrowRight size={17} />
              </a>
            </section>
          </>
        ) : (
          <section className="publish-section">
            <a className="back-link" href="#/">
              <ArrowLeft size={16} />
              Voltar ao mural
            </a>
            <div className="publish-heading">
              <span className="eyebrow">SUA VOZ, REGISTRADA.</span>
              <h1>
                Deixe sua marca<span>.</span>
              </h1>
              <p>Algumas palavras. Um registro que fica.</p>
            </div>
            <div className="publish-layout">
              <form className="compose-card" onSubmit={submit}>
                <div className="compose-title">
                  <MessageSquare size={19} />
                  <h2>Seu recado</h2>
                  <span>#{total === undefined ? "—" : total + 1}</span>
                </div>
                <label className="sr-only" htmlFor="message">
                  Escreva seu recado
                </label>
                <textarea
                  id="message"
                  placeholder="O que você gostaria de deixar registrado?"
                  value={content}
                  disabled={busy}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (status === "success") {
                      setStatus("idle");
                      setTransaction("");
                    }
                  }}
                  aria-describedby="char-count public-warning"
                />
                <div className="compose-meta">
                  <span>Pequenas palavras também deixam grandes marcas.</span>
                  <span
                    id="char-count"
                    className={count > 280 ? "over-limit" : ""}
                  >
                    {count}
                    <span> / 280</span>
                  </span>
                </div>
                <div className="public-warning" id="public-warning">
                  <LockKeyhole size={17} />
                  <p>
                    Seu recado será <strong>público e permanente</strong>. Ele
                    não poderá ser editado ou excluído. Não inclua dados
                    pessoais ou sensíveis.
                  </p>
                </div>
                {!configured && (
                  <div className="notice">
                    O contrato ainda não foi configurado. Consulte as instruções
                    no mural para ativar as publicações.
                  </div>
                )}
                {publishError && (
                  <div className="notice error" role="alert">
                    {publishError}
                  </div>
                )}
                {busy && (
                  <div className="notice" role="status">
                    <LoaderCircle size={17} className="spin" />
                    {status === "signing"
                      ? "Confirme a publicação na MetaMask…"
                      : "Transação enviada. Aguardando uma confirmação da rede…"}
                  </div>
                )}
                {status === "success" && (
                  <div className="notice success" role="status">
                    <Check size={18} />
                    <span>
                      Recado registrado com sucesso!{" "}
                      <a href="#/">Ver no mural</a>
                    </span>
                  </div>
                )}
                {transaction && txUrl(transaction) && (
                  <a
                    className="transaction-link"
                    href={txUrl(transaction)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Acompanhar transação
                    <ExternalLink size={14} />
                  </a>
                )}
                <div className="compose-footer">
                  <span>
                    <span className="green-dot" />
                    {networkName}
                  </span>
                  {!wallet.account || wallet.network !== chainId ? (
                    <button
                      type="button"
                      className="button primary"
                      disabled={walletBusy || busy}
                      onClick={handleWallet}
                    >
                      <Wallet size={17} />
                      {walletLabel}
                    </button>
                  ) : (
                    <button
                      className="button primary"
                      type="submit"
                      disabled={!configured || !validMessage(content) || busy}
                    >
                      {busy ? (
                        <LoaderCircle size={17} className="spin" />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                      Registrar na blockchain
                    </button>
                  )}
                </div>
              </form>
              <aside className="publish-aside">
                <span className="aside-icon">
                  <Wallet size={23} />
                </span>
                <h3>Uma assinatura. Sua autoria.</h3>
                <p>
                  Conecte sua MetaMask para assinar o recado. Seu endereço
                  público identifica você no mural.
                </p>
                {wallet.account && (
                  <div className="connected-account">
                    <span className="green-dot" />
                    <span>{shortAddress(wallet.account)}</span>
                    <button
                      className="icon-button"
                      onClick={() => void copy(wallet.account)}
                      title="Copiar carteira"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                )}
                <div className="aside-divider" />
                <h4>Como a publicação acontece</h4>
                <ol className="steps">
                  <li>
                    <span>1</span>Escreva até 280 caracteres.
                  </li>
                  <li>
                    <span>2</span>Confirme a transação na carteira.
                  </li>
                  <li>
                    <span>3</span>Seu recado aparece no mural.
                  </li>
                </ol>
                <p className="gas-note">
                  A publicação usa ETH de teste para a taxa da rede. A leitura é
                  gratuita.
                </p>
              </aside>
            </div>
          </section>
        )}
      </main>
      <footer>
        <a className="brand footer-brand" href="#/">
          <span className="brand-mark">
            <MessageSquare size={16} />
          </span>
          mural.
        </a>
        <span>Palavras conectam. A blockchain preserva.</span>
        <div>
          <span className="green-dot" />
          {networkName}
          <span className="footer-separator">·</span>
          <button onClick={() => setHelp(true)}>
            Sobre o projeto
            <ArrowUpRight size={13} />
          </button>
        </div>
      </footer>
      {help && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setHelp(false);
          }}
        >
          <Help onClose={() => setHelp(false)} />
        </div>
      )}
    </div>
  );
}
function Setup({ onHelp }: { onHelp: () => void }) {
  return (
    <div className="setup-state">
      <div className="setup-art">
        <span className="setup-dot" />
        <MessageSquare size={30} />
      </div>
      <span className="eyebrow">QUASE PRONTO PARA O PRIMEIRO RECADO</span>
      <h3>
        Um espaço em branco.
        <br />
        Infinitas possibilidades.
      </h3>
      <p>
        A interface está pronta. Conecte o contrato à rede Sepolia
        <br className="desktop-break" /> para começar a escrever uma história
        compartilhada.
      </p>
      <div className="setup-instructions">
        <span>
          01 <strong>Configure o RPC e a carteira de teste no .env</strong>
        </span>
        <span>
          02 <strong>Execute npm run deploy:sepolia</strong>
        </span>
        <span>
          03 <strong>Reinicie com npm run dev</strong>
        </span>
      </div>
      <button className="text-button" onClick={onHelp}>
        Entenda como funciona
        <ArrowUpRight size={15} />
      </button>
    </div>
  );
}
function Help({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes =
          ref.current?.querySelectorAll<HTMLElement>("button, a[href]");
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="help-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      tabIndex={-1}
      ref={ref}
    >
      <button
        className="modal-close icon-button"
        aria-label="Fechar"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <span className="aside-icon">
        <Layers3 size={24} />
      </span>
      <h2 id="help-title">Um mural, muitas vozes.</h2>
      <p>
        Os recados são armazenados em um contrato inteligente na Ethereum
        Sepolia, uma rede de testes.
      </p>
      <ol>
        <li>
          <strong>Leia sem conectar.</strong> As mensagens são públicas e podem
          ser consultadas diretamente na blockchain.
        </li>
        <li>
          <strong>Publique com MetaMask.</strong> Cada recado exige uma
          transação e ETH de teste para a taxa da rede.
        </li>
        <li>
          <strong>Confira o registro.</strong> O endereço do autor, o horário do
          bloco e a transação permitem verificar a publicação.
        </li>
      </ol>
      <p>
        O contrato não permite editar nem excluir recados e não verifica a
        veracidade do conteúdo.
      </p>
      {configured && (
        <p className="contract-detail">Contrato: {deployment!.address}</p>
      )}
      <button className="button primary" onClick={onClose}>
        Entendi
        <Check size={16} />
      </button>
    </div>
  );
}
