import { createEvaluationContext } from "./Ganko";

export default class GankoTemplate<P> {
  private readonly data: Template;
  private props: P;

  constructor(
    templateData: Template,
    props: P,
  ) {
    this.data = templateData;
    this.props = props;
  }

  public getName(): string {
    return this.data.name;
  }

  public getState(): P {
    return this.props;
  }

  /**
   * Updates the template with new values for the props.
   * @param newState The new values for the props of the statement.
   */
  public update(newState: Partial<P>) {
    const invalidatedEvaluations = this.getInvalidatedEvaluations(newState);
    for (let i = 0; i < invalidatedEvaluations.length; i++) {
      const invalidatedEvaluation = this.data.evaluations[invalidatedEvaluations[i]];
      if (invalidatedEvaluation.node) {
        invalidatedEvaluation.node.textContent = new Function(createEvaluationContext(newState) + "return " + invalidatedEvaluation.javascript)();
      }
    }
    this.props = { ...this.props, ...newState };
  }

  /**
   * Determines which evaluations need to be re-evaluated
   * based on the props that change and
   * those used in the evaluations.
   * @param newState The new values for the props.
   * @returns The indexes of the evaluations that should be invalidated.
   */
  private getInvalidatedEvaluations(newState: Partial<P>): number[] {
    const changedProps = Object.keys(newState);
    return (this.data.evaluations.map((e, i) => {
      for (const dependency of e.dependencies) {
        if (changedProps.includes(dependency)) {
          return i;
        }
      }
    }).filter(i => i !== undefined)) as number[];
  }
}