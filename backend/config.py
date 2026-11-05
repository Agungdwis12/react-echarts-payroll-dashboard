# ============================================================
# GOOGLE SHEET → AIVEN TABLE CONFIGURATION
# ============================================================

TABLE_CONFIG = {

    # ========================================================
    # 1. MASTER DETAIL DIVISI
    # ========================================================

    "master_detail_divisi": {

        "sheet_name": "MASTER DETAIL DIVISI",

        "table_name": "master_detail_divisi",

        "start_range": "A4:I",

        "columns": {
            "Bulan": "periode_bulan",
            "Divisi": "divisi",
            "Departemen": "departemen",
            "Layanan": "layanan",
            "Jumlah Transaksi": "jumlah_transaksi",
            "SDM Diproses": "sdm_diproses",
            "SLA Tercapai (%)": "sla_tercapai",
            "Total THP": "total_thp",
            "Unit": "unit",
        },

        "key_columns": [
            "periode_bulan",
            "divisi",
            "departemen",
            "layanan",
            "unit",
            "total_thp",
        ],
    },


    # ========================================================
    # 2. MASTER BAPP BULANAN
    # ========================================================

    "master_bapp_bulanan": {

        "sheet_name": "MASTER BAPP BULANAN",

        "table_name": "master_bapp_bulanan",

        "start_range": "A4:E",

        "columns": {
            "Bulan": "periode_bulan",
            "Status BAPP": "status_bapp",
            "Jumlah BAPP": "jumlah_bapp",
            "Nominal (Rp)": "nominal",
            "Unit": "unit",
        },

        "key_columns": [
            "periode_bulan",
            "status_bapp",
            "unit",
            "nominal",
        ],
    },


    # ========================================================
    # 3. MASTER DETAIL BAPP
    # ========================================================

    "master_detail_bapp": {

        "sheet_name": "MASTER DETAIL BAPP",

        "table_name": "master_detail_bapp",

        "start_range": "A4:I",

        "columns": {
            "Bulan": "periode_bulan",
            "Divisi": "divisi",
            "Departemen": "departemen",
            "Layanan": "layanan",
            "Status": "status",
            "Revenue": "revenue",
            "Unit": "unit",
            "Keterangan": "keterangan",
            "Text": "text",
        },

        "key_columns": [
            "periode_bulan",
            "divisi",
            "departemen",
            "layanan",
            "status",
            "revenue",
            "unit",
        ],
    },


    # ========================================================
    # 4. GPM
    # ========================================================

    "gpm": {

        "sheet_name": "GPM",

        "table_name": "gpm",

        "start_range": "A4:C",

        "columns": {
            "Bulan": "periode_bulan",
            "Revenue Payroll (Bapp)": "revenue_payroll_bapp",
            "Cost Payroll": "cost_payroll",
        },

        "key_columns": [
            "periode_bulan",
        ],
    },


    # ========================================================
    # 5. TARGET
    # ========================================================

    "target": {

        "sheet_name": "TARGET",

        "table_name": "target",

        "start_range": "A1:E",

        "columns": {
            "Bulan": "periode_bulan",
            "Nominal Target Sustain": "nominal_target_sustain",
            "Nominal Target Scaling": "nominal_target_scaling",
            "Realisasi Sustain": "realisasi_sustain",
            "Realisasi Scaling": "realisasi_scaling",
        },

        "key_columns": [
            "periode_bulan",
        ],
    },


    # ========================================================
    # 6. DETAIL COST
    # ========================================================

    "detail_cost": {

        "sheet_name": "DETAIL COST",

        "table_name": "detail_cost",

        "start_range": "A1:H",

        "columns": {
            "Bulan": "periode_bulan",
            "BEBAN JARKOM": "beban_jarkom",
            "BEBAN JASN​AKER": "beban_jasnaker",
            "BEBAN KERJASAMA PIHAK KETIGA": "beban_kerjasama_pihak_ketiga",
            "BEBAN LAIN - LAIN": "beban_lain_lain",
            "BEBAN MANDATORY GEDUNG": "beban_mandatory_gedung",
            "DEPRESIASI": "depresiasi",
            "TOTAL": "total",
        },

        "key_columns": [
            "periode_bulan",
        ],
    },
    
         # ========================================================
        # 6. Payroll Team 
        # ========================================================    
        "payroll_team": {
        "sheet_name": "Team Payroll",
        "start_range": "A1:F",
        "table_name": "payroll_team",
        "key_columns": ["nik"],
        "columns": {
            "NIK": "nik",
            "NAMA": "nama",
            "POSITION": "position",
            "PROJECT": "project",
            "WORKLOCATION": "worklocation",
            "UNIT": "unit",
        },
        "gid": 528009058
},
}