import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Lead } from "./Lead";
import { Stage } from "./Stage";

@Entity()
export class Opportunity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Lead, lead => lead.opportunities, { eager: true })
    lead: Lead;

    @ManyToOne(() => Stage, stage => stage.opportunities, { eager: true })
    stage: Stage;

    @Column("real")
    value: number;

    @Column("real", { nullable: true })
    expectedValue: number;

    @Column({ nullable: true })
    name: string;

    //adding this as a simple date field because we don't need timezone etc.  it's nullable because our current records don't have a value, and the sales team may have a true use case around creating an opportunity with unknown close date.
    @Column({ type: "date", nullable: true })
    expectedCloseDate: string | null; //this allows it to be explicitly null, rather than simply missing.  we may want to enable strictNullChecks in tsconfig in future.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Column("simple-json", { nullable: true })
    customFields: Record<string, any> = {};
}
