import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer, Svg, Circle } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import { mriazLogoDataUri } from './logos';

const TEAL = '#1B8FA8';
const NAVY = '#2C3E50';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#1A1A1A' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logoBox: { width: 140, height: 70, justifyContent: 'center' },
  logoImg: { width: 130, objectFit: 'contain' },
  titleBox: { alignItems: 'flex-end' },
  title: { fontSize: 18, fontWeight: 700, letterSpacing: 0.5 },
  ntn: { fontSize: 9, marginTop: 4 },
  divider: { height: 2, marginTop: 10, marginBottom: 14 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  buyerLabel: { fontSize: 10, marginBottom: 4 },
  buyerName: { fontSize: 12, fontWeight: 700 },
  metaLine: { fontSize: 9, marginTop: 2 },
  rightMeta: { alignItems: 'flex-end' },
  serial: { fontSize: 11, fontWeight: 700, marginTop: 4 },
  table: { marginTop: 6, borderWidth: 1, borderColor: '#D5D5D5' },
  tableHeaderRow: { flexDirection: 'row' },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: '#E4E4E4' },
  th: { padding: 5, fontSize: 8, fontWeight: 700, color: '#fff' },
  td: { padding: 5, fontSize: 8.5 },
  colQty: { width: '7%' },
  colUnit: { width: '8%' },
  colName: { width: '22%' },
  colSize: { width: '13%' },
  colRate: { width: '10%', textAlign: 'right' },
  colExcl: { width: '12%', textAlign: 'right' },
  colTaxRate: { width: '8%', textAlign: 'center' },
  colTaxAmt: { width: '10%', textAlign: 'right' },
  colIncl: { width: '10%', textAlign: 'right' },
  totalBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, marginTop: 0 },
  totalLabel: { fontSize: 11, fontWeight: 700, color: '#fff' },
  totalValue: { fontSize: 12, fontWeight: 700, color: '#fff' },
  thanks: { marginTop: 18, fontSize: 9.5, fontWeight: 700 },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#D5D5D5',
    paddingTop: 10,
  },
  footerCol: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '32%' },
  footerText: { fontSize: 8 },
});

function AbdullahImpexMark({ color }: { color: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Circle cx="24" cy="24" r="22" stroke={color} strokeWidth={3} fill="none" />
      <Circle cx="20" cy="24" r="22" stroke="#1A1A1A" strokeWidth={3} fill="none" />
    </Svg>
  );
}

interface InvoiceItem {
  product_name: string;
  size: string | null;
  unit: string | null;
  quantity: number;
  rate: number;
  tax_rate: number;
  value_excl_tax: number;
  tax_amount: number;
  value_incl_tax: number;
  sort_order: number;
}

interface InvoiceData {
  serial_number: number;
  invoice_date: string;
  period_start?: string | null;
  period_end?: string | null;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  companies: {
    name: string;
    ntn: string | null;
    strn: string | null;
    address: string | null;
    phone: string | null;
    phone2: string | null;
    email: string | null;
  };
  customers?: {
    name: string;
    ntn: string | null;
    strn: string | null;
    address: string | null;
  } | null;
  invoice_items: InvoiceItem[];
}

function money(n: number) {
  return Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 });
}

function InvoiceDocument({ invoice }: { invoice: InvoiceData }) {
  const isMRiaz = invoice.companies.name.toLowerCase().includes('m riaz');
  const accent = isMRiaz ? TEAL : NAVY;
  const items = [...invoice.invoice_items].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            {isMRiaz ? (
              <Image src={mriazLogoDataUri} style={styles.logoImg} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AbdullahImpexMark color={accent} />
                <View>
                  <Text style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Abdullah</Text>
                  <Text style={{ fontSize: 16, fontWeight: 700, color: accent }}>Impex</Text>
                </View>
              </View>
            )}
          </View>
          <View style={styles.titleBox}>
            <Text style={[styles.title, { color: accent }]}>SALES TAX INVOICE</Text>
            {invoice.companies.ntn ? <Text style={styles.ntn}>NTN : {invoice.companies.ntn}</Text> : null}
            {invoice.companies.strn ? <Text style={styles.ntn}>S.T Reg # : {invoice.companies.strn}</Text> : null}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: accent }]} />

        <View style={styles.metaRow}>
          <View style={{ maxWidth: '60%' }}>
            <Text style={styles.buyerLabel}>Buyer Name :</Text>
            <Text style={styles.buyerName}>{invoice.customers?.name ?? 'Walk-in Customer'}</Text>
            {invoice.customers?.ntn ? (
              <Text style={styles.metaLine}>N.T.N : {invoice.customers.ntn}</Text>
            ) : null}
            {invoice.customers?.strn ? (
              <Text style={styles.metaLine}>S.T Registration # : {invoice.customers.strn}</Text>
            ) : null}
            {invoice.customers?.address ? (
              <Text style={styles.metaLine}>Address : {invoice.customers.address}</Text>
            ) : null}
          </View>
          <View style={styles.rightMeta}>
            <Text style={styles.metaLine}>Date : {dayjs(invoice.invoice_date).format('D MMMM, YYYY')}</Text>
            {invoice.period_start && invoice.period_end ? (
              <Text style={styles.metaLine}>
                Period : {dayjs(invoice.period_start).format('D MMM YYYY')} – {dayjs(invoice.period_end).format('D MMM YYYY')}
              </Text>
            ) : null}
            <Text style={styles.serial}>Serial Number : {invoice.serial_number}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableHeaderRow, { backgroundColor: accent }]}>
            <Text style={[styles.th, styles.colQty]}>QTY</Text>
            <Text style={[styles.th, styles.colUnit]}>UNIT</Text>
            <Text style={[styles.th, styles.colName]}>PRODUCT NAME</Text>
            <Text style={[styles.th, styles.colSize]}>SIZE</Text>
            <Text style={[styles.th, styles.colRate]}>RATE</Text>
            <Text style={[styles.th, styles.colExcl]}>VALUE EXCL. S.T</Text>
            <Text style={[styles.th, styles.colTaxRate]}>RATE OF S.T</Text>
            <Text style={[styles.th, styles.colTaxAmt]}>TOTAL S.T PAYABLE</Text>
            <Text style={[styles.th, styles.colIncl]}>VALUE INCL. S.T</Text>
          </View>
          {items.map((item, idx) => (
            <View style={styles.tableRow} key={idx}>
              <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.td, styles.colUnit]}>{item.unit}</Text>
              <Text style={[styles.td, styles.colName]}>{item.product_name}</Text>
              <Text style={[styles.td, styles.colSize]}>{item.size}</Text>
              <Text style={[styles.td, styles.colRate]}>{money(item.rate)}</Text>
              <Text style={[styles.td, styles.colExcl]}>{money(item.value_excl_tax)}</Text>
              <Text style={[styles.td, styles.colTaxRate]}>{item.tax_rate ? `${item.tax_rate}%` : '-'}</Text>
              <Text style={[styles.td, styles.colTaxAmt]}>{item.tax_amount ? money(item.tax_amount) : '-'}</Text>
              <Text style={[styles.td, styles.colIncl]}>{money(item.value_incl_tax)}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.totalBar, { backgroundColor: accent }]}>
          <Text style={styles.totalLabel}>GRAND TOTAL :</Text>
          <Text style={styles.totalValue}>Rs. {money(invoice.grand_total)}</Text>
        </View>

        <Text style={styles.thanks}>Thank you for doing business with us!</Text>

        <View style={styles.footer}>
          <View style={styles.footerCol}>
            <Text style={styles.footerText}>
              {invoice.companies.phone}
              {invoice.companies.phone2 ? `  /  ${invoice.companies.phone2}` : ''}
            </Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerText}>{invoice.companies.email}</Text>
          </View>
          <View style={styles.footerCol}>
            <Text style={styles.footerText}>{invoice.companies.address}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(invoice: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
