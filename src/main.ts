import Ganko from "./Ganko";

const app = document.querySelector("#app")!;
const btn = document.querySelector("#btn")! as HTMLButtonElement;

let loading = true;

async function loadComponents() {
  await Ganko.read("./components/counter.templ");
  loading = false;
}

await loadComponents();

interface CounterProps {
  count: number;
  step: number;
  init: number;
}

btn.addEventListener("click", () => {
  if (!loading) {
    Ganko.useTemplateSync<CounterProps>("Counter", app, { count: 0 }, {
      btn: {
        click: (_, templ) => {
          templ.update({
            count: templ.getState().count + templ.getState().step,
            step: templ.getState().step + 1
          });
        }
      }
    });
  }
});