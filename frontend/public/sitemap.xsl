<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
    xmlns:html="http://www.w3.org/TR/REC-html40"
    xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
    <xsl:template match="/">
        <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title>XML Sitemap | ETOSM Technology</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <style type="text/css">
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
                        color: #334155;
                        background-color: #f8fafc;
                        margin: 0;
                        padding: 0;
                    }
                    .header {
                        background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%);
                        color: #ffffff;
                        padding: 40px 24px;
                    }
                    .header-content {
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    .header h1 {
                        margin: 0 0 8px 0;
                        font-size: 32px;
                        font-weight: 700;
                        letter-spacing: -0.5px;
                    }
                    .header p {
                        margin: 0;
                        font-size: 15px;
                        color: #e2e8f0;
                        line-height: 1.6;
                        max-width: 800px;
                    }
                    .header p a {
                        color: #67e8f9;
                        text-decoration: underline;
                    }
                    .container {
                        max-width: 1200px;
                        margin: -20px auto 40px auto;
                        padding: 0 24px;
                    }
                    .card {
                        background: #ffffff;
                        border-radius: 12px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
                        overflow: hidden;
                        border: 1px solid #e2e8f0;
                    }
                    .card-header {
                        padding: 20px 24px;
                        background-color: #ffffff;
                        border-bottom: 1px solid #f1f5f9;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .card-header h2 {
                        margin: 0;
                        font-size: 18px;
                        color: #0f172a;
                    }
                    .count-badge {
                        background-color: #e0f2fe;
                        color: #0369a1;
                        padding: 4px 12px;
                        border-radius: 9999px;
                        font-size: 13px;
                        font-weight: 600;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        text-align: left;
                        font-size: 14px;
                    }
                    thead th {
                        background-color: #0284c7;
                        color: #ffffff;
                        font-weight: 600;
                        padding: 14px 20px;
                        border: none;
                        text-transform: uppercase;
                        font-size: 12px;
                        letter-spacing: 0.5px;
                    }
                    tbody tr {
                        border-bottom: 1px solid #f1f5f9;
                        transition: background-color 0.15s ease;
                    }
                    tbody tr:hover {
                        background-color: #f8fafc;
                    }
                    tbody tr:last-child {
                        border-bottom: none;
                    }
                    tbody td {
                        padding: 14px 20px;
                        vertical-align: middle;
                    }
                    td.url-cell a {
                        color: #0284c7;
                        text-decoration: none;
                        font-weight: 500;
                        word-break: break-all;
                    }
                    td.url-cell a:hover {
                        text-decoration: underline;
                        color: #0369a1;
                    }
                    .badge-priority {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 6px;
                        font-size: 12px;
                        font-weight: 600;
                        background-color: #f1f5f9;
                        color: #475569;
                    }
                    .badge-high {
                        background-color: #dcfce7;
                        color: #15803d;
                    }
                    .badge-med {
                        background-color: #e0f2fe;
                        color: #0369a1;
                    }
                    .badge-low {
                        background-color: #fef3c7;
                        color: #b45309;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-content">
                        <h1>XML Sitemap</h1>
                        <p>
                            This XML Sitemap is what search engines like Google and Bing use to discover and index pages on 
                            <strong>ETOSM Technology</strong>.
                        </p>
                    </div>
                </div>

                <div class="container">
                    <div class="card">
                        <div class="card-header">
                            <h2>Indexed Pages</h2>
                            <span class="count-badge">
                                Total URLs: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
                            </span>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 55%;">URL</th>
                                    <th style="width: 15%;">Priority</th>
                                    <th style="width: 15%;">Change Freq</th>
                                    <th style="width: 15%;">Last Modified</th>
                                </tr>
                            </thead>
                            <tbody>
                                <xsl:for-each select="sitemap:urlset/sitemap:url">
                                    <tr>
                                        <td class="url-cell">
                                            <a href="{sitemap:loc}">
                                                <xsl:value-of select="sitemap:loc"/>
                                            </a>
                                        </td>
                                        <td>
                                            <xsl:choose>
                                                <xsl:when test="sitemap:priority &gt;= 0.9">
                                                    <span class="badge-priority badge-high"><xsl:value-of select="sitemap:priority"/></span>
                                                </xsl:when>
                                                <xsl:when test="sitemap:priority &gt;= 0.7">
                                                    <span class="badge-priority badge-med"><xsl:value-of select="sitemap:priority"/></span>
                                                </xsl:when>
                                                <xsl:otherwise>
                                                    <span class="badge-priority badge-low"><xsl:value-of select="sitemap:priority"/></span>
                                                </xsl:otherwise>
                                            </xsl:choose>
                                        </td>
                                        <td>
                                            <xsl:value-of select="sitemap:changefreq"/>
                                        </td>
                                        <td>
                                            <xsl:value-of select="sitemap:lastmod"/>
                                        </td>
                                    </tr>
                                </xsl:for-each>
                            </tbody>
                        </table>
                    </div>
                </div>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>
