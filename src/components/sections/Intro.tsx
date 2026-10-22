import { Wordmark } from "@/components/brand/Wordmark";
import { IntroController } from "./IntroController";

/**
 * Intro da primeira carga da sessão. Só aparece com data-intro no <html>
 * (decidido pelo script do <head>). O texto do hero continua no HTML por baixo.
 */
export function Intro() {
  return (
    <>
      <div className="intro" aria-hidden>
        <div className="intro-bg" data-intro-bg />
        <div className="intro-line" data-intro-line />
        <div className="intro-mark" data-intro-mark>
          <Wordmark className="text-accent" decorative />
        </div>
      </div>
      <IntroController />
    </>
  );
}
